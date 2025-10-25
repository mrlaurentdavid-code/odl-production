// =====================================================
// CONFIGURATION SUPABASE
// =====================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://xewnzetqvrovqjcvwkus.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhld256ZXRxdnJvdnFqY3Z3a3VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4OTU4NTMsImV4cCI6MjA3NTQ3MTg1M30.NnbWAZzgcBPFfVOCFTbLqeq8fxWLO_rN-ieBs5ObkHw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================
// VARIABLES GLOBALES
// =====================================================

let currentUser = null;
let currentUserProfile = null;
let allInvoices = [];
let uploadedFilePath = null;

// =====================================================
// CONVERSION DE DEVISE VERS CHF
// =====================================================

async function convertToCHF(amount, currency, date) {
    if (currency === 'CHF') {
        return { chfAmount: amount, rate: 1 };
    }

    try {
        const response = await fetch(`https://api.frankfurter.app/${date}?from=${currency}&to=CHF`);
        if (!response.ok) throw new Error('Taux de change non disponible');
        
        const data = await response.json();
        const rate = data.rates.CHF;
        if (!rate) throw new Error('Taux invalide');

        const chfAmount = parseFloat((amount * rate).toFixed(2));
        return { chfAmount, rate };
    } catch (error) {
        console.error("Erreur de conversion:", error);
        throw new Error(`Impossible de convertir ${currency} vers CHF pour la date ${date}`);
    }
}

async function updateConversion() {
    const amountInput = document.getElementById('montant_ttc');
    const currencySelect = document.getElementById('devise');
    const dateInput = document.getElementById('date');
    const resultInput = document.getElementById('conversion-result');
    const conversionRow = document.getElementById('conversion-row');

    if (!amountInput || !currencySelect || !dateInput || !resultInput) return;

    const amount = parseFloat(amountInput.value);
    const currency = currencySelect.value;
    const date = dateInput.value;

    // Si la devise est CHF, on masque la ligne de conversion
    if (currency === 'CHF') {
        if (conversionRow) conversionRow.style.display = 'none';
        return;
    }
    
    // Afficher la ligne de conversion pour les devises étrangères
    if (conversionRow) conversionRow.style.display = 'grid';
    
    if (!amount || !date) {
        resultInput.value = '';
        return;
    }

    resultInput.value = 'Conversion en cours...';

    try {
        const { chfAmount, rate } = await convertToCHF(amount, currency, date);
        resultInput.value = `${chfAmount} CHF (taux: ${rate.toFixed(4)})`;
        console.log(`💱 Conversion: ${amount} ${currency} → ${chfAmount} CHF (taux: ${rate})`);
    } catch (error) {
        console.error("❌ Erreur de conversion:", error);
        resultInput.value = 'Conversion indisponible';
    }
}

// =====================================================
// GESTION DE LA SESSION ET AUTHENTIFICATION SSO
// =====================================================

// Fonction pour récupérer un cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

let isCheckingSession = false;
let sessionChecked = false;

async function checkSession() {
    // Éviter les redirections multiples pendant la vérification
    if (isCheckingSession) {
        console.log('⏳ Vérification en cours, attente...');
        return;
    }

    isCheckingSession = true;

    // D'abord, vérifier le cookie SSO d'ODL Tools
    const ssoToken = getCookie('odl-sso-token');

    if (ssoToken) {
        console.log('🔐 Cookie SSO détecté, vérification...');
        try {
            // Créer une session Supabase avec le token SSO
            const { error: sessionError } = await supabase.auth.setSession({
                access_token: ssoToken,
                refresh_token: ssoToken
            });

            if (!sessionError) {
                // Maintenant vérifier l'utilisateur
                const { data: { user }, error } = await supabase.auth.getUser();

                if (user && !error) {
                    console.log('✅ SSO valide:', user.email);
                    currentUser = user;
                    await loadUserProfile();
                    isCheckingSession = false;
                    sessionChecked = true;

                    const currentPage = window.location.pathname.split('/').pop();
                    if ((currentPage === 'login.html' || currentPage === '') && !window.location.hash.includes('access_token')) {
                        window.location.href = 'index.html';
                    }
                    return;
                } else {
                    console.warn('⚠️ Utilisateur non valide après setSession');
                }
            } else {
                console.warn('⚠️ Cookie SSO invalide ou expiré:', sessionError);
            }
        } catch (error) {
            console.error('❌ Erreur vérification SSO:', error);
        }
    }

    // Fallback: vérifier la session Supabase classique
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        currentUser = session.user;
        await loadUserProfile();
        isCheckingSession = false;
        sessionChecked = true;

        const currentPage = window.location.pathname.split('/').pop();
        if ((currentPage === 'login.html' || currentPage === '') && !window.location.hash.includes('access_token')) {
            window.location.href = 'index.html';
        }
    } else {
        isCheckingSession = false;
        sessionChecked = true;

        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'login.html' && !window.location.hash.includes('access_token')) {
            // Rediriger vers ODL Tools avec returnUrl
            const returnUrl = encodeURIComponent(window.location.href);
            const loginUrl = window.location.hostname === 'localhost'
                ? `http://localhost:3001/login?returnUrl=${returnUrl}`
                : `https://app.odl-tools.ch/login?returnUrl=${returnUrl}`;

            console.log('🔒 Non authentifié, redirection vers:', loginUrl);
            window.location.href = loginUrl;
        }
    }
}

async function loadUserProfile() {
    try {
        if (!currentUser) return;
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error) throw error;
        currentUserProfile = data;
        updateUIForRole();
    } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
    }
}

function updateUIForRole() {
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        const isAdmin = currentUserProfile?.role === 'Administrateur' || currentUserProfile?.role === 'Admin';
        adminLink.style.display = isAdmin ? 'inline' : 'none';
    }
}

async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        await loadUserProfile();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erreur de connexion:', error);
        alert('Erreur de connexion: ' + error.message);
    }
}

async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        currentUser = null;
        currentUserProfile = null;
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Erreur de déconnexion:', error);
        alert('Erreur de déconnexion: ' + error.message);
    }
}

// =====================================================
// GESTION DES FACTURES
// =====================================================

async function loadInvoices() {
    try {
        const { data, error } = await supabase
            .from('factures')
            .select(`*, profiles!factures_user_id_fkey (full_name)`)
            .order('date', { ascending: false });
        
        if (error) throw error;
        
        allInvoices = data;
        displayInvoices(data);
        calculateTotal(data);
        populateFilters(data);
    } catch (error) {
        console.error('Erreur lors du chargement des factures:', error);
    }
}

function getStatusBadge(status) {
    const statusClean = status ? status.replace(/'/g, '').trim() : 'En attente de visa';
    let badgeClass = 'badge pending';
    
    switch(statusClean) {
        case 'En attente de visa': badgeClass = 'badge pending'; break;
        case 'Visé': badgeClass = 'badge validated'; break;
        case 'Validé': badgeClass = 'badge approved'; break;
        case 'Remboursé': badgeClass = 'badge reimbursed'; break;
        case 'Refusé': badgeClass = 'badge rejected'; break;
    }
    return `<span class="${badgeClass}">${statusClean}</span>`;
}

function displayInvoices(invoices) {
    const tbody = document.getElementById('invoices-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Aucune facture trouvée</td></tr>';
        return;
    }
    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        const date = new Date(invoice.date).toLocaleDateString('fr-FR');
        const declarant = invoice.profiles?.full_name || 'Non défini';
        
        let montantDisplay;
        if (invoice.devise === 'CHF') {
            montantDisplay = `${invoice.montant_ttc} CHF`;
        } else {
            const chfAmount = invoice.montant_ttc_chf || '—';
            montantDisplay = `${chfAmount} CHF<br><small style="color: var(--secondary-text-color);">(${invoice.montant_ttc} ${invoice.devise})</small>`;
        }
        
        row.innerHTML = `
            <td style="text-align: center;"><a href="invoice-detail.html?id=${invoice.id}" style="font-size: 1.5rem; text-decoration: none;">👁️</a></td>
            <td>${date}</td>
            <td>${invoice.fournisseur}</td>
            <td>${declarant}</td>
            <td>${invoice.categorie}</td>
            <td>${invoice.source_paiement}</td>
            <td>${getStatusBadge(invoice.status)}</td>
            <td style="text-align: right;">${montantDisplay}</td>
        `;
        tbody.appendChild(row);
    });
}

function calculateTotal(invoices) {
    const totalRow = document.getElementById('total-row');
    if (!totalRow) return;
    
    let totalCHF = 0;
    invoices.forEach(invoice => {
        if (invoice.devise === 'CHF') {
            totalCHF += parseFloat(invoice.montant_ttc);
        } else if (invoice.montant_ttc_chf) {
            totalCHF += parseFloat(invoice.montant_ttc_chf);
        }
    });
    
    totalRow.innerHTML = `<td colspan="7" style="text-align: right;"><strong>Total</strong></td><td style="text-align: right;"><strong>${totalCHF.toFixed(2)} CHF</strong></td>`;
}

// =====================================================
// FILTRES
// =====================================================
function populateFilters(invoices) {
    const categories = [...new Set(invoices.map(inv => inv.categorie).filter(Boolean))];
    const categorySelect = document.getElementById('filter-categorie');
    if (categorySelect) {
        while (categorySelect.options.length > 1) categorySelect.remove(1);
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
    }
    const sources = [...new Set(invoices.map(inv => inv.source_paiement).filter(Boolean))];
    const sourceSelect = document.getElementById('filter-source');
    if (sourceSelect) {
         while (sourceSelect.options.length > 1) sourceSelect.remove(1);
        sources.forEach(source => {
            const option = document.createElement('option');
            option.value = source;
            option.textContent = source;
            sourceSelect.appendChild(option);
        });
    }
    const declarants = [...new Set(invoices.map(inv => inv.profiles?.full_name).filter(Boolean))];
    const declarantSelect = document.getElementById('filter-declarant');
    if (declarantSelect) {
         while (declarantSelect.options.length > 1) declarantSelect.remove(1);
        declarants.forEach(declarant => {
            const option = document.createElement('option');
            option.value = declarant;
            option.textContent = declarant;
            declarantSelect.appendChild(option);
        });
    }
}

window.applyFilters = function() {
    const fournisseur = document.getElementById('filter-fournisseur')?.value.toLowerCase() || '';
    const categorie = document.getElementById('filter-categorie')?.value || '';
    const source = document.getElementById('filter-source')?.value || '';
    const declarant = document.getElementById('filter-declarant')?.value || '';
    const dateStart = document.getElementById('filter-date-start')?.value || '';
    const dateEnd = document.getElementById('filter-date-end')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';
    
    const filtered = allInvoices.filter(invoice => {
        const matchFournisseur = !fournisseur || invoice.fournisseur.toLowerCase().includes(fournisseur);
        const matchCategorie = !categorie || invoice.categorie === categorie;
        const matchSource = !source || invoice.source_paiement === source;
        const matchDeclarant = !declarant || invoice.profiles?.full_name === declarant;
        const matchDateStart = !dateStart || invoice.date >= dateStart;
        const matchDateEnd = !dateEnd || invoice.date <= dateEnd;
        const invoiceStatus = invoice.status ? invoice.status.replace(/'/g, '').trim() : 'En attente de visa';
        const matchStatus = !status || invoiceStatus === status;
        return matchFournisseur && matchCategorie && matchSource && matchDeclarant && matchDateStart && matchDateEnd && matchStatus;
    });
    displayInvoices(filtered);
    calculateTotal(filtered);
};

window.resetFilters = function() {
    document.getElementById('filter-fournisseur').value = '';
    document.getElementById('filter-categorie').value = '';
    document.getElementById('filter-source').value = '';
    document.getElementById('filter-declarant').value = '';
    document.getElementById('filter-date-start').value = '';
    document.getElementById('filter-date-end').value = '';
    document.getElementById('filter-status').value = '';
    displayInvoices(allInvoices);
    calculateTotal(allInvoices);
};

// =====================================================
// PAGE DÉTAIL DE LA FACTURE
// =====================================================
async function loadInvoiceDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const invoiceId = urlParams.get('id');
    if (!invoiceId) {
        alert('Aucune facture spécifiée');
        window.location.href = 'index.html';
        return;
    }
    try {
        const { data: invoice, error } = await supabase.from('factures').select(`*, profiles!factures_user_id_fkey (full_name)`).eq('id', invoiceId).single();
        if (error) throw error;
        const { data: sourceData } = await supabase.from('sources_de_paiement').select('necessite_remboursement').eq('nom', invoice.source_paiement).single();
        const { data: publicUrlData } = supabase.storage.from('justificatifs').getPublicUrl(invoice.lien_justificatif);
        displayInvoiceDetail(invoice, sourceData, publicUrlData.publicUrl);
    } catch (error) {
        console.error('Erreur lors du chargement:', error);
        alert('Erreur lors du chargement de la facture: ' + error.message);
    }
}

function displayInvoiceDetail(invoice, sourceInfo, publicFileUrl) {
    const statusClean = invoice.status ? invoice.status.replace(/'/g, '').trim() : 'En attente de visa';
    const isAdmin = currentUserProfile?.role === 'Admin' || currentUserProfile?.role === 'Administrateur';
    const isOwner = currentUser.id === invoice.user_id;
    const canEdit = isOwner && (statusClean === 'En attente de visa' || statusClean === 'Refusé');
    
    document.getElementById('detail-fournisseur').textContent = invoice.fournisseur;
    document.getElementById('detail-date').textContent = new Date(invoice.date).toLocaleDateString('fr-FR');
    document.getElementById('detail-status-badge').innerHTML = getStatusBadge(statusClean);
    
    let montantTTC = `${invoice.montant_ttc} ${invoice.devise}`;
    if (invoice.devise !== 'CHF' && invoice.montant_ttc_chf) {
        montantTTC += ` (${invoice.montant_ttc_chf} CHF)`;
    }
    document.getElementById('detail-montant-ttc').textContent = montantTTC;
    
    document.getElementById('detail-montant-ht').textContent = invoice.montant_ht ? `${invoice.montant_ht} ${invoice.devise}` : 'Non renseigné';
    document.getElementById('detail-montant-tva').textContent = invoice.montant_tva ? `${invoice.montant_tva} ${invoice.devise}` : 'Non renseigné';
    document.getElementById('detail-declarant').textContent = invoice.profiles?.full_name || 'Non défini';
    document.getElementById('detail-categorie').textContent = invoice.categorie;
    document.getElementById('detail-source').textContent = invoice.source_paiement;
    displayFileViewer(publicFileUrl);
    
    const editButton = document.getElementById('edit-button');
    const deleteButton = document.getElementById('delete-button');
    
    console.log('🔍 Permissions:', { isOwner, isAdmin, canEdit });
    console.log('🔘 Boutons trouvés:', { editButton: !!editButton, deleteButton: !!deleteButton });
    
    if (canEdit && editButton) {
        editButton.style.display = 'inline-block';
        editButton.addEventListener('click', () => {
            window.location.href = `edit-invoice.html?id=${invoice.id}`;
        });
    }
    
    if ((isOwner || isAdmin) && deleteButton) {
        deleteButton.style.display = 'inline-block';
        
        // Supprimer les anciens event listeners
        const newDeleteButton = deleteButton.cloneNode(true);
        deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);
        
        // Ajouter le nouvel event listener
        newDeleteButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🗑️ Clic détecté sur le bouton supprimer');
            deleteInvoiceFromDetail(invoice.id, invoice.lien_justificatif);
        });
        
        console.log('✅ Bouton supprimer configuré pour la facture ID:', invoice.id);
    }
    if (isAdmin) {
        const adminActions = document.getElementById('admin-actions');
        adminActions.style.display = 'block';
        const statusSelect = document.getElementById('status-select');
        statusSelect.value = statusClean;
        const remboursOption = statusSelect.querySelector('option[value="Remboursé"]');
        if (remboursOption && !sourceInfo?.necessite_remboursement) {
            remboursOption.style.display = 'none';
        }
        const statusForm = document.getElementById('status-form');
        statusForm.onsubmit = (e) => {
            e.preventDefault();
            updateInvoiceStatus(invoice.id, statusSelect.value);
        };
    }
}

function displayFileViewer(fileUrl) {
    const viewer = document.getElementById('file-viewer');
    if (!viewer || !fileUrl) {
        viewer.innerHTML = `<p style="text-align: center; padding: 2rem;">Aucun justificatif trouvé.</p>`;
        return;
    }
    const extension = fileUrl.split('.').pop().toLowerCase().split('?')[0];
    if (extension === 'pdf') {
        viewer.innerHTML = `<iframe src="${fileUrl}" style="width: 100%; height: 600px; border: none;"></iframe>`;
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
        viewer.innerHTML = `<img src="${fileUrl}" style="width: 100%; height: auto; display: block;">`;
    } else {
        viewer.innerHTML = `<div style="padding: 2rem; text-align: center;"><p>Aperçu non disponible.</p><a href="${fileUrl}" target="_blank" role="button">Télécharger</a></div>`;
    }
}

async function updateInvoiceStatus(invoiceId, newStatus) {
    if (!confirm(`Changer le statut en "${newStatus}" ?`)) return;
    try {
        const { error } = await supabase.from('factures').update({ status: newStatus }).eq('id', invoiceId);
        if (error) throw error;
        alert('Statut mis à jour');
        location.reload();
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de la mise à jour: ' + error.message);
    }
}

async function deleteInvoiceFromDetail(id, filePath) {
    console.log('🗑️ Tentative de suppression de la facture ID:', id, 'Fichier:', filePath);
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
        console.log('❌ Suppression annulée par l\'utilisateur');
        return;
    }
    
    try {
        // Supprimer le fichier du storage
        if (filePath) {
            console.log('📄 Suppression du fichier:', filePath);
            const { error: storageError } = await supabase.storage.from('justificatifs').remove([filePath]);
            if (storageError) {
                console.warn('⚠️ Erreur suppression fichier (non bloquant):', storageError);
            } else {
                console.log('✅ Fichier supprimé');
            }
        }
        
        // Supprimer la facture de la base de données
        console.log('🗄️ Suppression de la facture de la base de données...');
        const { error: deleteError } = await supabase.from('factures').delete().eq('id', id);
        
        if (deleteError) {
            console.error('❌ Erreur lors de la suppression:', deleteError);
            throw deleteError;
        }
        
        console.log('✅ Facture supprimée avec succès');
        alert('Facture supprimée avec succès !');
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('❌ Erreur complète:', error);
        alert('Erreur lors de la suppression: ' + error.message);
    }
}

// =====================================================
// AJOUT/ÉDITION DE FACTURES
// =====================================================
async function handleFileSelectForAnalysis(e) {
    let file = e.target.files[0];
    if (!file) return;
    const detailsFieldset = document.getElementById('invoice-details');
    const spinner = document.getElementById('analysis-spinner');
    const spinnerPara = spinner.querySelector('p');
    detailsFieldset.disabled = true;
    spinner.style.display = 'block';
    uploadedFilePath = null;
    try {
        spinnerPara.textContent = 'Upload du justificatif en cours...';
        const filePath = `justificatifs/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('justificatifs').upload(filePath, file);
        if (uploadError) throw uploadError;
        uploadedFilePath = filePath;

        console.log('✅ Justificatif uploadé:', filePath);

        // Analyse avec l'API backend
        spinnerPara.textContent = 'Analyse de la facture en cours...';
        const apiUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:8080/api/analyze-invoice'
            : 'https://ndf-api.odl-tools.ch/api/analyze-invoice';

        // Récupérer le token d'authentification de la session Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error('Session non trouvée');
        }

        const analysisResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ filePath })
        });

        if (!analysisResponse.ok) {
            throw new Error('Erreur lors de l\'analyse');
        }

        const extractedData = await analysisResponse.json();

        // Remplir les champs
        document.getElementById('fournisseur').value = extractedData.fournisseur || '';
        document.getElementById('date').value = extractedData.date || '';
        document.getElementById('montant_ttc').value = extractedData.montant_ttc || '';
        document.getElementById('montant_ht').value = extractedData.montant_ht || '';
        document.getElementById('montant_tva').value = extractedData.montant_tva || '';
        document.getElementById('devise').value = extractedData.devise || 'CHF';
        document.getElementById('categorie').value = extractedData.categorie || '';

        console.log('✅ Données extraites:', extractedData);
    } catch (error) {
        console.error("Erreur durant l'analyse:", error);
        alert("Analyse échouée. Veuillez remplir les champs manuellement.");
    } finally {
        spinner.style.display = 'none';
        detailsFieldset.disabled = false;

        setTimeout(() => {
            updateConversion();
        }, 100);
    }
}

async function addInvoice(formData) {
    try {
        if (!uploadedFilePath) {
            return alert("Le justificatif n'a pas été traité. Impossible de continuer.");
        }
        
        let montantCHF = null;
        let tauxChange = null;
        
        if (formData.devise !== 'CHF') {
            try {
                const conversion = await convertToCHF(
                    parseFloat(formData.montant_ttc),
                    formData.devise,
                    formData.date
                );
                montantCHF = conversion.chfAmount;
                tauxChange = conversion.rate;
            } catch (error) {
                if (!confirm(`Impossible de convertir ${formData.devise} vers CHF. Voulez-vous continuer sans conversion ?`)) {
                    return;
                }
            }
        } else {
            montantCHF = parseFloat(formData.montant_ttc);
            tauxChange = 1;
        }
        
        const { error: insertError } = await supabase.from('factures').insert([{
            fournisseur: formData.fournisseur,
            date: formData.date,
            montant_ttc: parseFloat(formData.montant_ttc),
            devise: formData.devise,
            categorie: formData.categorie,
            source_paiement: formData.source_paiement,
            lien_justificatif: uploadedFilePath,
            montant_ht: formData.montant_ht ? parseFloat(formData.montant_ht) : null,
            montant_tva: formData.montant_tva ? parseFloat(formData.montant_tva) : null,
            user_id: currentUser.id,
            status: 'En attente de visa',
            montant_ttc_chf: montantCHF,
            taux_change: tauxChange
        }]);
        if (insertError) throw insertError;
        alert('Facture ajoutée avec succès !');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'ajout: ' + error.message);
    }
}

async function loadInvoiceForEdit() {
    const urlParams = new URLSearchParams(window.location.search);
    const invoiceId = urlParams.get('id');
    if (!invoiceId) return window.location.href = 'index.html';
    const cancelLink = document.getElementById('cancel-edit');
    if (cancelLink) cancelLink.href = `invoice-detail.html?id=${invoiceId}`;
    try {
        await Promise.all([loadCategories(), loadPaymentSources()]);
        const { data: invoice, error } = await supabase.from('factures').select('*').eq('id', invoiceId).single();
        if (error) throw error;
        document.getElementById('fournisseur').value = invoice.fournisseur;
        document.getElementById('date').value = invoice.date;
        document.getElementById('montant_ttc').value = invoice.montant_ttc;
        document.getElementById('devise').value = invoice.devise;
        document.getElementById('montant_ht').value = invoice.montant_ht;
        document.getElementById('montant_tva').value = invoice.montant_tva;
        document.getElementById('categorie').value = invoice.categorie;
        document.getElementById('source_paiement').value = invoice.source_paiement;
        const { data: { publicUrl } } = supabase.storage.from('justificatifs').getPublicUrl(invoice.lien_justificatif);
        const link = document.getElementById('current-file-link');
        link.href = publicUrl;
        link.textContent = invoice.lien_justificatif.split('/').pop();
        
        await updateConversion();
        
        document.getElementById('invoice-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateInvoice(invoiceId, invoice.lien_justificatif);
        });
    } catch (error) {
        console.error('Erreur chargement pour édition:', error);
        alert('Impossible de charger les données de la facture.');
    }
}

async function updateInvoice(invoiceId, oldFilePath) {
    let newFilePath = oldFilePath;
    const fileInput = document.getElementById('justificatif');
    try {
        if (fileInput.files.length > 0) {
            let file = fileInput.files[0];
            newFilePath = `justificatifs/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('justificatifs').upload(newFilePath, file);
            if (uploadError) throw uploadError;
        }
        
        const montantTTC = parseFloat(document.getElementById('montant_ttc').value);
        const devise = document.getElementById('devise').value;
        const date = document.getElementById('date').value;
        
        let montantCHF = null;
        let tauxChange = null;
        
        if (devise !== 'CHF') {
            try {
                const conversion = await convertToCHF(montantTTC, devise, date);
                montantCHF = conversion.chfAmount;
                tauxChange = conversion.rate;
            } catch (error) {
                if (!confirm(`Impossible de convertir ${devise} vers CHF. Voulez-vous continuer sans conversion ?`)) {
                    return;
                }
            }
        } else {
            montantCHF = montantTTC;
            tauxChange = 1;
        }
        
        const { error: updateError } = await supabase.from('factures').update({
            fournisseur: document.getElementById('fournisseur').value,
            date: date,
            montant_ttc: montantTTC,
            devise: devise,
            montant_ht: document.getElementById('montant_ht').value ? parseFloat(document.getElementById('montant_ht').value) : null,
            montant_tva: document.getElementById('montant_tva').value ? parseFloat(document.getElementById('montant_tva').value) : null,
            categorie: document.getElementById('categorie').value,
            source_paiement: document.getElementById('source_paiement').value,
            lien_justificatif: newFilePath,
            montant_ttc_chf: montantCHF,
            taux_change: tauxChange
        }).eq('id', invoiceId);
        if (updateError) throw updateError;
        alert('Facture mise à jour !');
        window.location.href = `invoice-detail.html?id=${invoiceId}`;
    } catch(error) {
        alert('Erreur lors de la mise à jour: ' + error.message);
    }
}

// =====================================================
// CATÉGORIES
// =====================================================
async function loadCategories() {
    try {
        const { data, error } = await supabase.from('Catégorie de dépense').select('*').order('Catégorie');
        if (error) throw error;
        const select = document.getElementById('categorie');
        if (select) {
            select.innerHTML = '<option value="">Sélectionnez une catégorie</option>';
            data.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.Catégorie;
                option.textContent = cat.Catégorie;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}
async function loadAdminCategories() {
    try {
        const { data, error } = await supabase.from('Catégorie de dépense').select('*').order('Catégorie');
        if (error) throw error;
        const tbody = document.getElementById('categories-list');
        if (!tbody) return;
        tbody.innerHTML = '';
        data.forEach(cat => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${cat.Catégorie}</td><td style="text-align: right;"><a href="#" onclick="deleteCategory(${cat.id})" style="color: #ff3b30;">Supprimer</a></td>`;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erreur:', error);
    }
}
async function addCategory(categoryName) {
    try {
        const { error } = await supabase.from('Catégorie de dépense').insert([{ Catégorie: categoryName }]);
        if (error) throw error;
        alert('Catégorie ajoutée avec succès');
        loadAdminCategories();
        document.getElementById('category-name').value = '';
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur: ' + error.message);
    }
}
window.deleteCategory = async function(id) {
    if (!confirm('Êtes-vous sûr ?')) return;
    try {
        const { error } = await supabase.from('Catégorie de dépense').delete().eq('id', id);
        if (error) throw error;
        alert('Catégorie supprimée');
        loadAdminCategories();
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur: ' + error.message);
    }
};

// =====================================================
// SOURCES DE PAIEMENT
// =====================================================
async function loadPaymentSources() {
    try {
        const { data, error } = await supabase.from('sources_de_paiement').select('*').order('nom');
        if (error) throw error;
        const select = document.getElementById('source_paiement');
        if (select) {
            select.innerHTML = '<option value="">Sélectionnez une source</option>';
            data.forEach(source => {
                const option = document.createElement('option');
                option.value = source.nom;
                option.textContent = source.nom;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// =====================================================
// UTILISATEURS (ADMIN)
// =====================================================
async function loadUsersForAdmin() {
    try {
        const { data, error } = await supabase.from('profiles').select('*').order('full_name');
        if (error) throw error;
        const tbody = document.getElementById('users-list');
        if (!tbody) return;
        tbody.innerHTML = '';
        data.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.full_name || 'Non défini'}</td>
                <td>${user.email}</td>
                <td><select onchange="changeUserRole('${user.id}', this.value)" style="border: none; background: transparent; font-weight: 500;"><option value="Admin" ${user.role === 'Admin' || user.role === 'Administrateur' ? 'selected' : ''}>Admin</option><option value="Collaborateur" ${user.role === 'Collaborateur' ? 'selected' : ''}>Collaborateur</option></select></td>
                <td style="text-align: right;"><a href="#" onclick="deleteUser('${user.id}')" style="color: #ff3b30;">Supprimer</a></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erreur:', error);
    }
}

window.changeUserRole = async function(userId, newRole) {
    if (!confirm(`Changer le rôle en "${newRole}" ?`)) {
        loadUsersForAdmin();
        return;
    }
    try {
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) throw error;
        alert('Rôle modifié avec succès');
        loadUsersForAdmin();
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur: ' + error.message);
        loadUsersForAdmin();
    }
};

window.deleteUser = async function(userId) {
    try {
        // Vérifier si l'utilisateur a des factures
        const { data: userInvoices, error: checkError } = await supabase
            .from('factures')
            .select('id')
            .eq('user_id', userId);

        if (checkError) {
            console.error('Erreur lors de la vérification:', checkError);
            alert('Erreur lors de la vérification: ' + checkError.message);
            return;
        }

        const invoiceCount = userInvoices?.length || 0;

        if (invoiceCount > 0) {
            // L'utilisateur a des factures, proposer des options
            const message = `⚠️ ATTENTION: Cet utilisateur a ${invoiceCount} facture(s) dans le système.\n\n` +
                `Vous ne pouvez pas supprimer cet utilisateur directement.\n\n` +
                `Options:\n` +
                `1. Supprimer d'abord toutes ses factures\n` +
                `2. Désactiver l'utilisateur en changeant son rôle\n` +
                `3. Réassigner ses factures à un autre utilisateur (nécessite modification manuelle en base)`;

            alert(message);
            return;
        }

        // L'utilisateur n'a pas de factures, confirmer la suppression
        if (!confirm('⚠️ Supprimer définitivement cet utilisateur ?\n\nCette action est irréversible.')) {
            return;
        }

        const { error } = await supabase.from('profiles').delete().eq('id', userId);

        if (error) throw error;

        alert('✅ Utilisateur supprimé avec succès');
        loadUsersForAdmin();

    } catch (error) {
        console.error('❌ Erreur:', error);

        // Détecter les erreurs de contrainte de clé étrangère
        if (error.code === '23503' || error.message.includes('foreign key constraint')) {
            alert('❌ Impossible de supprimer cet utilisateur car il a des factures associées.\n\n' +
                  'Veuillez d\'abord supprimer toutes ses factures ou les réassigner à un autre utilisateur.');
        } else {
            alert('❌ Erreur lors de la suppression: ' + error.message);
        }
    }
};

// =====================================================
// INITIALISATION DU ROUTEUR
// =====================================================
document.addEventListener('DOMContentLoaded', async function() {
    await checkSession();
    const currentPage = window.location.pathname.split('/').pop();
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => { e.preventDefault(); logout(); });
    }
    
    switch(currentPage) {
        case 'login.html':
            const loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.addEventListener('submit', (e) => { e.preventDefault(); login(document.getElementById('email').value, document.getElementById('password').value); });
            break;
        case 'index.html': case '':
            loadInvoices();
            break;
        case 'add-invoice.html':
            await loadCategories();
            await loadPaymentSources();
            document.getElementById('justificatif').addEventListener('change', handleFileSelectForAnalysis);
            
            ['montant_ttc', 'devise', 'date'].forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.addEventListener('input', updateConversion);
            });
            
            const addForm = document.getElementById('invoice-form');
            if (addForm) {
                addForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    addInvoice({
                        fournisseur: document.getElementById('fournisseur').value,
                        date: document.getElementById('date').value,
                        montant_ttc: document.getElementById('montant_ttc').value,
                        devise: document.getElementById('devise').value,
                        categorie: document.getElementById('categorie').value,
                        source_paiement: document.getElementById('source_paiement').value,
                        montant_ht: document.getElementById('montant_ht').value,
                        montant_tva: document.getElementById('montant_tva').value
                    });
                });
            }
            break;
        case 'invoice-detail.html':
            loadInvoiceDetail();
            break;
        case 'edit-invoice.html':
            loadInvoiceForEdit();
            
            ['montant_ttc', 'devise', 'date'].forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) field.addEventListener('input', updateConversion);
            });
            break;
        case 'admin.html':
            const isAdmin = currentUserProfile?.role === 'Administrateur' || currentUserProfile?.role === 'Admin';
            if (!isAdmin) {
                alert('Accès non autorisé');
                window.location.href = 'index.html';
                return;
            }
            loadAdminCategories();
            loadUsersForAdmin();
            const categoryForm = document.getElementById('category-form');
            if (categoryForm) {
                categoryForm.addEventListener('submit', (e) => { e.preventDefault(); addCategory(document.getElementById('category-name').value); });
            }
            break;
    }
});

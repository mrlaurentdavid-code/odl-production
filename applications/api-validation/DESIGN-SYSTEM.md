# 🎨 ODL Design System v1.0

Documentation complète du système de design pour ODL Tools.

---

## 📐 Principes de Design

### Vision
Un système de design moderne, cohérent et accessible qui privilégie :
- **Clarté** : Hiérarchie visuelle claire et lisible
- **Efficacité** : Composants réutilisables et performants
- **Cohérence** : Expérience utilisateur unifiée
- **Accessibilité** : WCAG 2.1 Level AA minimum

---

## 🎨 Design Tokens

### Couleurs

#### Palette Principale
```typescript
primary: {
  50: '#eff6ff',   // Backgrounds très clairs
  500: '#3b82f6',  // PRIMARY - Boutons, liens
  600: '#2563eb',  // Hover states
  900: '#1e3a8a',  // Textes foncés
}

secondary: {
  500: '#06b6d4',  // SECONDARY - Accents
  600: '#0891b2',  // Hover
}

success: '#22c55e'   // Validations, succès
warning: '#f59e0b'   // Alertes, attention
danger: '#ef4444'    // Erreurs, suppressions
neutral: '#64748b'   // Textes, bordures
```

#### Couleurs Sémantiques
```typescript
background: {
  DEFAULT: '#ffffff',    // Fond principal
  secondary: '#f8fafc',  // Fond alternatif
  tertiary: '#f1f5f9',   // Fond tertiaire
}

border: {
  DEFAULT: '#e2e8f0',    // Bordures standard
  light: '#f1f5f9',      // Bordures légères
  dark: '#cbd5e1',       // Bordures marquées
}
```

---

### Typographie

#### Famille de polices
```css
font-sans: Inter, system-ui, -apple-system, sans-serif
font-mono: JetBrains Mono, SF Mono, monospace
```

#### Échelle typographique
```typescript
text-xs: 0.75rem / 1rem      // Labels, badges
text-sm: 0.875rem / 1.25rem  // Body secondaire
text-base: 1rem / 1.5rem     // Body principal
text-lg: 1.125rem / 1.75rem  // Sous-titres
text-xl: 1.25rem / 1.75rem   // Titres de carte
text-2xl: 1.5rem / 2rem      // Titres de section
text-4xl: 2.25rem / 2.5rem   // Titres de page
```

#### Poids de police
- **300** : Light (rarement utilisé)
- **400** : Regular (texte body)
- **500** : Medium (labels, navigation)
- **600** : Semibold (titres)
- **700** : Bold (emphase forte)

---

### Spacing

Système basé sur `0.25rem` (4px) :
```typescript
0.5 = 2px    // Micro-spacing
1 = 4px      // Très serré
2 = 8px      // Serré
3 = 12px     // Standard small
4 = 16px     // Standard
6 = 24px     // Medium
8 = 32px     // Large
12 = 48px    // XL
16 = 64px    // 2XL
```

---

### Border Radius
```typescript
sm: 0.25rem      // Petits éléments (badges)
DEFAULT: 0.375rem // Standard (inputs)
md: 0.5rem       // Cards (8px)
lg: 0.75rem      // Boutons (12px)
xl: 1rem         // Cards larges (16px)
2xl: 1.5rem      // Modals (24px)
full: 9999px     // Circles
```

---

### Shadows
```typescript
sm: Ombres légères (hover léger)
DEFAULT: Ombres standards (cards)
md: Ombres moyennes (élevation modérée)
lg: Ombres fortes (modals, popovers)
xl: Ombres très fortes (dropdowns)
```

---

## 🧩 Composants

### Button

#### Variants
```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="success">Success</Button>
<Button variant="danger">Danger</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

#### Sizes
```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button> {/* Default */}
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>
```

#### Props
```typescript
isLoading?: boolean      // Affiche un spinner
leftIcon?: ReactNode     // Icône à gauche
rightIcon?: ReactNode    // Icône à droite
fullWidth?: boolean      // 100% width
```

---

### Card

#### Variants
```tsx
<Card variant="default">Avec bordure</Card>
<Card variant="elevated">Avec shadow</Card>
<Card variant="flat">Fond gris</Card>
<Card variant="interactive">Hover effect</Card>
```

#### Anatomie
```tsx
<Card>
  <CardHeader>
    <CardTitle>Titre</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Contenu principal
  </CardContent>
  <CardFooter>
    Actions
  </CardFooter>
</Card>
```

---

### Badge

#### Variants
```tsx
<Badge variant="default">Default</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="danger">Danger</Badge>
<Badge variant="outline">Outline</Badge>
```

#### Avec dot
```tsx
<Badge dot variant="success">En ligne</Badge>
```

---

### AppCard (Dashboard)

Composant spécialisé pour le dashboard :
```tsx
<AppCard
  id="app-id"
  title="Application"
  description="Description de l'app"
  icon={<Calculator className="w-12 h-12" />}
  url="https://app.url"
  available={true}
  gradient="bg-gradient-to-br from-blue-500 to-blue-700"
  stats={[
    { label: 'Métrique 1', value: '123' },
    { label: 'Métrique 2', value: '+12%' }
  ]}
  badge={{ label: 'Nouveau', variant: 'success' }}
/>
```

**Caractéristiques** :
- Header gradient avec icône (h-32)
- Stats en bas de card
- Badge optionnel (coin supérieur droit)
- Hover effect avec indicateur "Ouvrir"
- Badge "Bientôt" si `available={false}`

---

## 📱 Responsive Design

### Breakpoints
```typescript
sm: 640px    // Mobile landscape
md: 768px    // Tablet
lg: 1024px   // Desktop
xl: 1280px   // Large desktop
2xl: 1536px  // Extra large
```

### Grid System
```tsx
// Dashboard apps
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {apps.map(app => <AppCard key={app.id} {...app} />)}
</div>

// Stats summary
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  {stats.map(stat => <StatCard key={stat.id} {...stat} />)}
</div>
```

---

## ♿ Accessibilité

### Contraste
Tous les textes respectent **WCAG 2.1 Level AA** :
- Texte normal : ratio 4.5:1 minimum
- Texte large (18px+) : ratio 3:1 minimum

### Focus States
```css
focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
```

### Navigation Clavier
- Tous les éléments interactifs sont accessibles au clavier
- `Tab` / `Shift+Tab` pour naviguer
- `Enter` / `Space` pour activer

---

## 🚀 Utilisation

### Import
```tsx
import { Button, Card, Badge, AppCard } from '@/components/ui'
import { cn } from '@/lib/utils'
```

### Utility Function `cn()`
Merge des classes Tailwind avec priorité :
```tsx
<Button className={cn('custom-class', condition && 'conditional-class')}>
  Button
</Button>
```

---

## 📦 Dépendances

```json
{
  "tailwindcss": "^4.1.14",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.7.0",
  "lucide-react": "^0.468.0"
}
```

---

## 🔄 Évolution

### v1.1 (Prévue)
- [ ] Composant Input
- [ ] Composant Select
- [ ] Composant Modal
- [ ] Composant Toast/Notification
- [ ] Composant Dropdown
- [ ] Dark mode

### v1.2 (Future)
- [ ] Composant Table
- [ ] Composant Tabs
- [ ] Composant Accordion
- [ ] Charts components
- [ ] Form validation

---

## 📞 Support

Pour toute question sur le Design System :
- Documentation : `/DESIGN-SYSTEM.md`
- Composants : `/components/ui/`
- Tokens : `/tailwind.config.ts`

---

**Dernière mise à jour** : 13 octobre 2025
**Version** : 1.0.0
**Auteur** : ODL Group

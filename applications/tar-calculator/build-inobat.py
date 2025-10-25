#!/usr/bin/env python3
"""
Script pour construire la base de données INOBAT complète à partir du CSV officiel
"""

import csv
import json
import re

def parse_weight_range(weight_str):
    """Parse weight range string like '1-24 grammes' into min/max values"""
    if not weight_str:
        return None, None

    # Extract numbers
    match = re.search(r'(\d+[\'\s]?\d*)\s*-\s*(\d+[\'\s]?\d*)', weight_str)
    if match:
        min_val = int(match.group(1).replace("'", "").replace(" ", ""))
        max_val = int(match.group(2).replace("'", "").replace(" ", "").replace("grammes", ""))
        return min_val, max_val

    # Single value like "plus des 6'001 grammes"
    match = re.search(r'(\d+[\'\s]?\d+)', weight_str)
    if match:
        val = int(match.group(1).replace("'", "").replace(" ", ""))
        return val, 999999

    return None, None

def build_inobat_database(csv_path, output_path):
    """Build complete INOBAT JSON database from CSV"""

    database = {
        "source": "INOBAT 2026",
        "dateValidite": "2026-01-01",
        "tva": 8.1,
        "categories": {
            "1_piles_portables": {
                "nom": "Piles portables et piles bouton",
                "description": "En vrac ou intégrées dans un appareil",
                "subcategories": {}
            },
            "2_piles_industrielles": {
                "nom": "Piles industrielles",
                "description": "En vrac ou intégrées dans un appareil",
                "exemption": "avec possibilité d'exonération de la taxe, ORRChim art. 6.1 al. 3",
                "subcategories": {}
            },
            "3_batteries_vehicules": {
                "nom": "Batteries de véhicules",
                "description": "Pour le démarrage, l'éclairage ou l'allumage",
                "exemption": "avec possibilité d'exonération de la taxe, ORRChim art. 6.1 al. 3",
                "subcategories": {}
            }
        },
        "motsClefs": {
            "pile": ["pile", "battery", "batterie", "accumulateur", "cell"],
            "rechargeable": ["rechargeable", "lithium", "li-ion", "nimh", "nicd", "lifepo4"],
            "alcaline": ["alcaline", "alkaline"],
            "zinc": ["zinc", "zinc-charbon", "zinc-carbon"],
            "outil": ["perceuse", "visseuse", "scie", "outil", "tool", "robot"],
            "vehicule": ["vélo", "bike", "ebike", "scooter", "trottinette", "moto", "auto", "voiture"],
            "industriel": ["industriel", "industrial", "traction", "solaire"]
        }
    }

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f, delimiter=';')

        current_category = None
        current_subcategory = None
        current_article_base = None

        for row in reader:
            if len(row) < 6:
                continue

            article_no = row[0].strip()
            type_pile = row[1].strip() if len(row) > 1 else ""
            ansi = row[2].strip() if len(row) > 2 else ""
            d_col = row[3].strip() if len(row) > 3 else ""
            iec = row[4].strip() if len(row) > 4 else ""
            remarks_weight = row[5].strip() if len(row) > 5 else ""
            tarif = row[6].strip() if len(row) > 6 else ""

            # Skip headers and empty rows
            if not article_no or article_no.startswith("Article") or article_no.startswith("INOBAT"):
                continue

            # Skip #REF! errors
            if "#REF!" in tarif or not tarif:
                continue

            # Parse tariff value
            try:
                tarif_value = float(tarif.replace(",", ".").replace(" ", ""))
            except:
                continue

            # Category 1: Portable batteries (10000-70006)
            if article_no.startswith("1") or article_no.startswith("2") or article_no.startswith("3") or article_no.startswith("4") or article_no.startswith("5") or article_no.startswith("6") or article_no.startswith("7"):
                if len(article_no) == 5 and article_no[1:] == "0000":
                    current_subcategory = article_no + "_" + type_pile.replace(" ", "_").replace("/", "_")[:30]
                    database["categories"]["1_piles_portables"]["subcategories"][current_subcategory] = {
                        "code": article_no,
                        "nom": type_pile,
                        "entries": []
                    }
                elif current_subcategory and article_no.isdigit():
                    entry = {
                        "articleNo": article_no,
                        "tarifHT": tarif_value
                    }

                    if ansi:
                        entry["ansi"] = ansi
                    if iec:
                        entry["iec"] = iec
                    if d_col:
                        entry["designation"] = d_col
                    if remarks_weight:
                        entry["remarque"] = remarks_weight
                        # Parse weight range
                        min_w, max_w = parse_weight_range(remarks_weight)
                        if min_w is not None:
                            entry["poidsMin"] = min_w
                            entry["poidsMax"] = max_w

                    database["categories"]["1_piles_portables"]["subcategories"][current_subcategory]["entries"].append(entry)

            # Category 2: Industrial batteries (81000-89111)
            elif article_no.startswith("8"):
                if len(article_no) == 5 and article_no[1:] == "0000":
                    current_subcategory = article_no + "_" + type_pile.replace(" ", "_").replace("/", "_")[:30]
                    database["categories"]["2_piles_industrielles"]["subcategories"][current_subcategory] = {
                        "code": article_no,
                        "nom": type_pile,
                        "entries": []
                    }
                elif current_subcategory and article_no.isdigit():
                    entry = {
                        "articleNo": article_no,
                        "tarifHT": tarif_value
                    }

                    if remarks_weight:
                        entry["remarque"] = remarks_weight
                        min_w, max_w = parse_weight_range(remarks_weight)
                        if min_w is not None:
                            entry["poidsMin"] = min_w
                            entry["poidsMax"] = max_w

                    database["categories"]["2_piles_industrielles"]["subcategories"][current_subcategory]["entries"].append(entry)

            # Category 3: Vehicle batteries (91000-95036)
            elif article_no.startswith("9"):
                if len(article_no) == 5 and article_no[1:] == "0000":
                    current_subcategory = article_no + "_" + type_pile.replace(" ", "_").replace("/", "_")[:30]
                    database["categories"]["3_batteries_vehicules"]["subcategories"][current_subcategory] = {
                        "code": article_no,
                        "nom": type_pile,
                        "entries": []
                    }
                elif current_subcategory and article_no.isdigit():
                    entry = {
                        "articleNo": article_no,
                        "tarifHT": tarif_value
                    }

                    if remarks_weight:
                        entry["remarque"] = remarks_weight
                        min_w, max_w = parse_weight_range(remarks_weight)
                        if min_w is not None:
                            entry["poidsMin"] = min_w
                            entry["poidsMax"] = max_w

                    database["categories"]["3_batteries_vehicules"]["subcategories"][current_subcategory]["entries"].append(entry)

    # Write to JSON file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(database, f, ensure_ascii=False, indent=2)

    print(f"✅ Base INOBAT créée: {output_path}")

    # Print statistics
    cat1_total = sum(len(sub["entries"]) for sub in database["categories"]["1_piles_portables"]["subcategories"].values())
    cat2_total = sum(len(sub["entries"]) for sub in database["categories"]["2_piles_industrielles"]["subcategories"].values())
    cat3_total = sum(len(sub["entries"]) for sub in database["categories"]["3_batteries_vehicules"]["subcategories"].values())

    print(f"\n📊 Statistiques:")
    print(f"   - Piles portables: {cat1_total} entrées")
    print(f"   - Piles industrielles: {cat2_total} entrées")
    print(f"   - Batteries véhicules: {cat3_total} entrées")
    print(f"   - TOTAL: {cat1_total + cat2_total + cat3_total} entrées")

if __name__ == "__main__":
    csv_path = "/Users/laurentdavid/Downloads/Inobat.csv"
    output_path = "/Users/laurentdavid/Desktop/odl-projects/tar-calculator/inobat-complet-2026.json"

    build_inobat_database(csv_path, output_path)

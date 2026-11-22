/* Player-safe source-item names and source prices only.
 * Separate from the live Purchase Catalog and its purchasecommit service.
 * Candidate identifiers reconcile to WARDEN-ONLY Source Gear Staging in Drive.
 * These entries never authorize access, establish final mechanics, or enable checkout.
 */
(() => {
  'use strict';
  window.HubSpecialRequests = Object.freeze([
    {
      "id": "SRC-0001",
      "item": "Surgery Theater",
      "source": "Cold Storage v0.1",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "150kcr (ship medbay add-on)",
      "referenceOnly": false
    },
    {
      "id": "SRC-0002",
      "item": "Xenograft Module",
      "source": "Cold Storage v0.1",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "50kcr (ship medbay add-on)",
      "referenceOnly": false
    },
    {
      "id": "SRC-0003",
      "item": "Genetic Biolab",
      "source": "Cold Storage v0.1",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "50kcr per module",
      "referenceOnly": false
    },
    {
      "id": "SRC-0004",
      "item": "K9 Unit",
      "source": "Cold Storage v0.1",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "450kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0005",
      "item": "Paradox Box",
      "source": "Cold Storage v0.1",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "200kcr (Rare)",
      "referenceOnly": false
    },
    {
      "id": "SRC-0006",
      "item": "Cyberware Conversion Package",
      "source": "Cold Storage v0.1",
      "group": "SERVICE / REVIEW",
      "sourcePrice": "10x base cyberware cost — not a fixed retail unit",
      "referenceOnly": true
    },
    {
      "id": "SRC-0007",
      "item": "Pocket Jump",
      "source": "Cold Storage v0.1",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "95kcr (Rare)",
      "referenceOnly": false
    },
    {
      "id": "SRC-0008",
      "item": "Dimensional Shifter",
      "source": "Cold Storage v0.1",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "35kcr (Rare)",
      "referenceOnly": false
    },
    {
      "id": "SRC-0009",
      "item": "Bloodpact Dagger",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL / REVIEW",
      "sourcePrice": "900cr (Rare)",
      "referenceOnly": true
    },
    {
      "id": "SRC-0010",
      "item": "Runes of the Unwritten",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL / REVIEW",
      "sourcePrice": "2.2kcr",
      "referenceOnly": true
    },
    {
      "id": "SRC-0011",
      "item": "Effigy of the Star Spawn",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL / REVIEW",
      "sourcePrice": "38kcr (Rare)",
      "referenceOnly": true
    },
    {
      "id": "SRC-0012",
      "item": "Forbidden Inscriptions",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL / REVIEW",
      "sourcePrice": "11kcr (Rare)",
      "referenceOnly": true
    },
    {
      "id": "SRC-0013",
      "item": "The Owed Thing",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL / REVIEW",
      "sourcePrice": "56kcr (Rare)",
      "referenceOnly": true
    },
    {
      "id": "SRC-0014",
      "item": "Burden of Faith",
      "source": "Cold Storage v0.1",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "800cr (Rare)",
      "referenceOnly": false
    },
    {
      "id": "SRC-0015",
      "item": "Kunai (Throwing Knives)",
      "source": "Cold Storage v0.1",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "250cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0016",
      "item": "Ninjato (Short Sword)",
      "source": "Cold Storage v0.1",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "3kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0017",
      "item": "Plastic Explosive",
      "source": "Cold Storage v0.1",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0018",
      "item": "Singularity Grenade",
      "source": "Cold Storage v0.1",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "50kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0019",
      "item": "Gas Grenade",
      "source": "Cold Storage v0.1",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "500cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0020",
      "item": "Enteroflora Emetica",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL SPECIMEN",
      "sourcePrice": "Not priced",
      "referenceOnly": true
    },
    {
      "id": "SRC-0021",
      "item": "Dermophyta Corrosa",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL SPECIMEN",
      "sourcePrice": "Not priced",
      "referenceOnly": true
    },
    {
      "id": "SRC-0022",
      "item": "Neurophyllum Torpida",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL SPECIMEN",
      "sourcePrice": "Not priced",
      "referenceOnly": true
    },
    {
      "id": "SRC-0023",
      "item": "Mycotrauma Hallucinata",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL SPECIMEN",
      "sourcePrice": "Not priced",
      "referenceOnly": true
    },
    {
      "id": "SRC-0024",
      "item": "Pulmophyta Constricta",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL SPECIMEN",
      "sourcePrice": "Not priced",
      "referenceOnly": true
    },
    {
      "id": "SRC-0025",
      "item": "Metasoma Languoris",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL SPECIMEN",
      "sourcePrice": "Not priced",
      "referenceOnly": true
    },
    {
      "id": "SRC-0026",
      "item": "Cerebrosa Oblivia",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL SPECIMEN",
      "sourcePrice": "Not priced",
      "referenceOnly": true
    },
    {
      "id": "SRC-0027",
      "item": "Hematophyta Exsanguis",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL SPECIMEN",
      "sourcePrice": "Not priced",
      "referenceOnly": true
    },
    {
      "id": "SRC-0028",
      "item": "Thanatoflora Paralytica",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL SPECIMEN",
      "sourcePrice": "Not priced",
      "referenceOnly": true
    },
    {
      "id": "SRC-0029",
      "item": "Somnifera Caprani",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL SPECIMEN",
      "sourcePrice": "Not priced",
      "referenceOnly": true
    },
    {
      "id": "SRC-0030",
      "item": "Basalt Aggregate",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL RESOURCE",
      "sourcePrice": "~5kcr gross deposit example — NOT a retail price",
      "referenceOnly": true
    },
    {
      "id": "SRC-0031",
      "item": "Industrial Quartz",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL RESOURCE",
      "sourcePrice": "~10kcr gross deposit example — NOT a retail price",
      "referenceOnly": true
    },
    {
      "id": "SRC-0032",
      "item": "Copper Vein",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL RESOURCE",
      "sourcePrice": "~15kcr gross deposit example — NOT a retail price",
      "referenceOnly": true
    },
    {
      "id": "SRC-0033",
      "item": "Iron Ore",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL RESOURCE",
      "sourcePrice": "~20kcr gross deposit example — NOT a retail price",
      "referenceOnly": true
    },
    {
      "id": "SRC-0034",
      "item": "Nickel Deposit",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL RESOURCE",
      "sourcePrice": "~25kcr gross deposit example — NOT a retail price",
      "referenceOnly": true
    },
    {
      "id": "SRC-0035",
      "item": "Titanium Ore",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL RESOURCE",
      "sourcePrice": "~30kcr gross deposit example — NOT a retail price",
      "referenceOnly": true
    },
    {
      "id": "SRC-0036",
      "item": "Tungsten Cluster",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL RESOURCE",
      "sourcePrice": "~35kcr gross deposit example — NOT a retail price",
      "referenceOnly": true
    },
    {
      "id": "SRC-0037",
      "item": "Platinum Vein",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL RESOURCE",
      "sourcePrice": "~40kcr gross deposit example — NOT a retail price",
      "referenceOnly": true
    },
    {
      "id": "SRC-0038",
      "item": "Iridium Deposit",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL RESOURCE",
      "sourcePrice": "~45kcr gross deposit example — NOT a retail price",
      "referenceOnly": true
    },
    {
      "id": "SRC-0039",
      "item": "Unknown Alien Alloy",
      "source": "Cold Storage v0.1",
      "group": "NON-RETAIL RESOURCE",
      "sourcePrice": "~50kcr gross deposit example — NOT a retail price",
      "referenceOnly": true
    },
    {
      "id": "SRC-0040",
      "item": "Streetweave Replacement Plate",
      "source": "Cold Storage v0.1",
      "group": "ARMOR & CLOTHING",
      "sourcePrice": "1kcr each, 500cr with Rimwise",
      "referenceOnly": false
    },
    {
      "id": "SRC-0041",
      "item": "NERVEHOOK",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "350cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0042",
      "item": "BOLTMAW",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1.2kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0043",
      "item": "DAGGERLINE X9",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1.1kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0044",
      "item": "RADIANT 9C",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0045",
      "item": "SHATTERCALL",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1.3kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0046",
      "item": "SUNLESS KING",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0047",
      "item": "HARC-72 HELIOS ARC",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0048",
      "item": "EX-LZR 91",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "7kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0049",
      "item": "VX-9 QUILLSTORM",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2.3kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0050",
      "item": "MIR-2 BARRAGE",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0051",
      "item": "KSR-93 STRIDER",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0052",
      "item": "VX-77 SHREDLINE",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0053",
      "item": "MB-12 MINI BREACHER",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1.8kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0054",
      "item": "BR-66 SCATTERSPINE",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "3kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0055",
      "item": "SIX12",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0056",
      "item": "SLUGREAVER X1",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "4.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0057",
      "item": "SG-1 TAU’RI",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "6kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0058",
      "item": "NOSTROM-0 SAR",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "7kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0059",
      "item": "EXPAN-53 SR",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "7.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0060",
      "item": "CAPRI-K4 AR",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "8kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0061",
      "item": "XRG BATTLESTAR",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "10kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0062",
      "item": "XRG CALLISTO",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "8.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0063",
      "item": "EV3-NT HORIZON",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "15kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0064",
      "item": "AMR-X88 RUNNERBLADE",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "20kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0065",
      "item": "ATR-F1 SERENITY",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "35kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0066",
      "item": "Subsonic Ammo",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "100cr per magazine",
      "referenceOnly": false
    },
    {
      "id": "SRC-0067",
      "item": "Incendiary Ammo",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "150cr per magazine",
      "referenceOnly": false
    },
    {
      "id": "SRC-0068",
      "item": "High Speed Ammo",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "100cr per magazine",
      "referenceOnly": false
    },
    {
      "id": "SRC-0069",
      "item": "Hollow Point Ammo",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "200cr per magazine",
      "referenceOnly": false
    },
    {
      "id": "SRC-0070",
      "item": "FMJ Ammo",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "200cr per magazine",
      "referenceOnly": false
    },
    {
      "id": "SRC-0071",
      "item": "Slug Shells",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "300cr per magazine",
      "referenceOnly": false
    },
    {
      "id": "SRC-0072",
      "item": "Dragon Breath Shells",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "150cr per magazine",
      "referenceOnly": false
    },
    {
      "id": "SRC-0073",
      "item": "Flechette Shells",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "150cr per magazine",
      "referenceOnly": false
    },
    {
      "id": "SRC-0074",
      "item": "Pulsetag Ammo",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2kcr per round",
      "referenceOnly": false
    },
    {
      "id": "SRC-0075",
      "item": "Grav-X8 Ammo",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2.5kcr per round",
      "referenceOnly": false
    },
    {
      "id": "SRC-0076",
      "item": "Smart Ammo",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "5kcr per magazine",
      "referenceOnly": false
    },
    {
      "id": "SRC-0077",
      "item": "Whisperlock Mk.III Silencer",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "500cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0078",
      "item": "Vectorflow GX Muzzle Brake",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "200cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0079",
      "item": "NB-11 Shatterer Muzzle Device",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "150cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0080",
      "item": "Red Dot-X Reflex Sight",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "500cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0081",
      "item": "Falcon 4x Combat Optic",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "750cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0082",
      "item": "VXR-8 Telescopic Scope",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0083",
      "item": "Portable Bioscanner",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "4.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0084",
      "item": "Angled Foregrip",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "500cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0085",
      "item": "SK-9 Breach Fang Bayonet",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "100cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0086",
      "item": "HVL-4 Heavy Grenade Launcher",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0087",
      "item": "The Breacher Shotgun",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0088",
      "item": "Red Tracer-7 Laser Sight",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1.2kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0089",
      "item": "Targeting System The Executioner",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0090",
      "item": "PM-S Precision Stock",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0091",
      "item": "Trauma S9 Stock",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0092",
      "item": "BlitzMag Stock",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1.8kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0093",
      "item": "FR-1 Utility Stock",
      "source": "Heat Signature v1.3",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "900cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0094",
      "item": "Boarding Pike",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "100cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0095",
      "item": "Chem Sprayer",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0096",
      "item": "Club/Improvised",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "Free",
      "referenceOnly": false
    },
    {
      "id": "SRC-0097",
      "item": "Concussion Gun",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0098",
      "item": "Crossbow",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "200cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0099",
      "item": "Expanding bolt",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "10cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0100",
      "item": "Explosive bolt",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "50cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0101",
      "item": "Cryogen Gun",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "700cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0102",
      "item": "Disposable Gun",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "100cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0103",
      "item": "EMP Disruptor",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "3kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0104",
      "item": "Energy Halberd",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "3kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0105",
      "item": "Explosive Lance",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1.4kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0106",
      "item": "Flechette Thrower",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0107",
      "item": "Frontier Rifle",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "500cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0108",
      "item": "Grenade Launcher",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "3.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0109",
      "item": "Beanbag",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "20cr each",
      "referenceOnly": false
    },
    {
      "id": "SRC-0110",
      "item": "Frag",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "400cr each",
      "referenceOnly": false
    },
    {
      "id": "SRC-0111",
      "item": "Incendiary",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "600cr each",
      "referenceOnly": false
    },
    {
      "id": "SRC-0112",
      "item": "Tear Gas",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "350cr each",
      "referenceOnly": false
    },
    {
      "id": "SRC-0113",
      "item": "Toxic Gas",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "900cr each",
      "referenceOnly": false
    },
    {
      "id": "SRC-0114",
      "item": "Hand Cannon",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1.8kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0115",
      "item": "Mining Drill",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "3kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0116",
      "item": "Net Launcher",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "400cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0117",
      "item": "Pepper Spray",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "50cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0118",
      "item": "Phase Rifle",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2.8kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0119",
      "item": "Pipe Shotgun",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "100cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0120",
      "item": "Plasma Launcher",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "5.4kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0121",
      "item": "Pneumatic Blunderbuss",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "800cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0122",
      "item": "Precision Rifle",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2.9kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0123",
      "item": "Pressure Hose",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "250cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0124",
      "item": "Radiation Gun",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "4kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0125",
      "item": "Rail Cannon",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "14kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0126",
      "item": "Riot Gun",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "250cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0127",
      "item": "Rivet Thrower",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1.6kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0128",
      "item": "Rocket Launcher (Dumb)",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "8kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0129",
      "item": "High-Explosive (HE) rocket",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "600cr each",
      "referenceOnly": false
    },
    {
      "id": "SRC-0130",
      "item": "Kinetic-Energy (KE) rocket",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "3kcr each",
      "referenceOnly": false
    },
    {
      "id": "SRC-0131",
      "item": "Rocket Launcher (Smart)",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "30kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0132",
      "item": "Hive-of-Bees rocket",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "4kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0133",
      "item": "Fire-And-Forget rocket",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "8kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0134",
      "item": "Rotary Cannon",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "20kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0135",
      "item": "Saber",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "120cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0136",
      "item": "Sawn-Off",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "800cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0137",
      "item": "Self-Guided Rifle",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "6kcr in source; Warden-selected future price 7kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0138",
      "item": "Stun Gun",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "450cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0139",
      "item": "Throwing Knife",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "50cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0140",
      "item": "Ultrasonic Amplifier",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "6kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0141",
      "item": "Voltage Arc Blaster",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0142",
      "item": "Bayonet",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "150cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0143",
      "item": "Dazzler",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "120cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0144",
      "item": "Extended Barrel",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "25% as weapon",
      "referenceOnly": false
    },
    {
      "id": "SRC-0145",
      "item": "Extended Capacity",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "25% as weapon",
      "referenceOnly": false
    },
    {
      "id": "SRC-0146",
      "item": "Thermal Projector",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0147",
      "item": "Smart Sight",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "50% as weapon",
      "referenceOnly": false
    },
    {
      "id": "SRC-0148",
      "item": "Suppressor",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "200cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0149",
      "item": "Tactical Sling/Holster",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "100cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0150",
      "item": "Targeting Computer",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "25% as weapon",
      "referenceOnly": false
    },
    {
      "id": "SRC-0151",
      "item": "Underslung Flamethrower",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0152",
      "item": "Underslung Grenade Launcher",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "1.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0153",
      "item": "Underslung Shotgun",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "900cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0154",
      "item": "Bio Suit",
      "source": "Armory Expanded v2",
      "group": "ARMOR & CLOTHING",
      "sourcePrice": "700cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0155",
      "item": "Counterpressure Suit",
      "source": "Armory Expanded v2",
      "group": "ARMOR & CLOTHING",
      "sourcePrice": "3kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0156",
      "item": "Fire Suit",
      "source": "Armory Expanded v2",
      "group": "ARMOR & CLOTHING",
      "sourcePrice": "2kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0157",
      "item": "Mining Rig",
      "source": "Armory Expanded v2",
      "group": "ARMOR & CLOTHING",
      "sourcePrice": "50kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0158",
      "item": "Penal Bridle",
      "source": "Armory Expanded v2",
      "group": "ARMOR & CLOTHING",
      "sourcePrice": "1kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0159",
      "item": "Plastimail",
      "source": "Armory Expanded v2",
      "group": "ARMOR & CLOTHING",
      "sourcePrice": "200cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0160",
      "item": "Riot Shield",
      "source": "Armory Expanded v2",
      "group": "ARMOR & CLOTHING",
      "sourcePrice": "2kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0161",
      "item": "Shock Assault Exo-Armor",
      "source": "Armory Expanded v2",
      "group": "ARMOR & CLOTHING",
      "sourcePrice": "2.5mcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0162",
      "item": "Adrenaline Stim",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "1.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0163",
      "item": "Anti-Anxiety Pills (x5)",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "60cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0164",
      "item": "Auto-Belay Harness",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "300cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0165",
      "item": "Battery Backpack",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "2kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0166",
      "item": "Bliss Pill",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "200cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0167",
      "item": "Combat Drone",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "15kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0168",
      "item": "Data Miner",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "1kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0169",
      "item": "EMP Pulse Emitter",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "10kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0170",
      "item": "Grapple",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "600cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0171",
      "item": "Gravity Chute",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "50cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0172",
      "item": "Grenade (Smoke)",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "150cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0173",
      "item": "Hack-O-Matic",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "2.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0174",
      "item": "Handcuffs",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "150cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0175",
      "item": "Hangover Pills x5",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "50cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0176",
      "item": "Hash Joint",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "10cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0177",
      "item": "Hyper-Speed Vial",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "100cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0178",
      "item": "Injector (Poison)",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "3kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0179",
      "item": "Injector (Sedative)",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "50cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0180",
      "item": "Malware Disk (Adware)",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "500cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0181",
      "item": "Malware Disk (Logger)",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "1kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0182",
      "item": "Quick Foam Injector",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "1kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0183",
      "item": "Servo-Limb",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "100kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0184",
      "item": "Shock Collar",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "1.2kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0185",
      "item": "Solar Charger",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "900cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0186",
      "item": "Surveillance Bug",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "1.5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0187",
      "item": "Traversal Grav-Suit",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "20kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0188",
      "item": "Virtual Reality Headset",
      "source": "Armory Expanded v2",
      "group": "TOOLS / REVIEW",
      "sourcePrice": "5kcr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0189",
      "item": "Conventional Ammo",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "10cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0190",
      "item": "Flechettes",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "2cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0191",
      "item": "Chem/Cyro Tubes [spelling as printed]",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "20cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0192",
      "item": "Fuel",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "20cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0193",
      "item": "Harpoons/Nails/Rivets",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "10cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0194",
      "item": "Heavy Ammo",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "100cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0195",
      "item": "High-Caliber Ammo",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "30cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0196",
      "item": "Plasma Charges",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "35cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0197",
      "item": "Pulse/Phase Ammo",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "30cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0198",
      "item": "Non-Lethal Ammo",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "5cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0199",
      "item": "Shotgun Shells",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "8cr",
      "referenceOnly": false
    },
    {
      "id": "SRC-0200",
      "item": "Sonic Charges",
      "source": "Armory Expanded v2",
      "group": "WEAPONS & SECURITY",
      "sourcePrice": "20cr",
      "referenceOnly": false
    }
  ]);
})();

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Color palette ─────────────────────────────────────────────────────────
const PRIMARY = [15, 82, 186] as const; // Deep blue
const PRIMARY_LIGHT = [230, 240, 255] as const;
const ACCENT = [0, 184, 148] as const; // Teal/green
const DARK = [30, 30, 45] as const;
const GRAY = [120, 120, 140] as const;
const LIGHT_BG = [245, 247, 252] as const;
const WHITE = [255, 255, 255] as const;

type RGB = readonly [number, number, number];

// ─── Helper functions ──────────────────────────────────────────────────────

function setColor(doc: jsPDF, color: RGB) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function drawRect(doc: jsPDF, x: number, y: number, w: number, h: number, color: RGB) {
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(x, y, w, h, "F");
}

function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, color: RGB) {
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y, w, h, r, r, "F");
}

function addPageNumber(doc: jsPDF, pageNum: number) {
  doc.setFontSize(9);
  setColor(doc, GRAY);
  doc.setFont("helvetica", "normal");
  doc.text(`${pageNum}`, 105, 290, { align: "center" });
}

function addFooterLine(doc: jsPDF) {
  doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setLineWidth(0.5);
  doc.line(20, 282, 190, 282);
  doc.setFontSize(7);
  setColor(doc, GRAY);
  doc.text("SAYELE Message | www.sayele.co | contact@sayele.co", 105, 287, { align: "center" });
}

function sectionTitle(doc: jsPDF, title: string, y: number, icon?: string): number {
  // Accent bar
  drawRoundedRect(doc, 20, y, 4, 20, 2, ACCENT);

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  const prefix = icon ? `${icon}  ` : "";
  doc.text(`${prefix}${title}`, 30, y + 14);
  return y + 30;
}

function subTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  setColor(doc, GRAY);
  const lines = doc.splitTextToSize(text, 160);
  doc.text(lines, 20, y);
  return y + lines.length * 6 + 4;
}

function bulletPoint(doc: jsPDF, text: string, y: number, x = 25): number {
  // Bullet dot
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.circle(x, y - 1.5, 1.5, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(doc, DARK);
  const lines = doc.splitTextToSize(text, 155);
  doc.text(lines, x + 5, y);
  return y + lines.length * 5 + 3;
}

function featureCard(doc: jsPDF, title: string, desc: string, x: number, y: number, w: number) {
  // Card background
  drawRoundedRect(doc, x, y, w, 38, 3, LIGHT_BG);

  // Title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, PRIMARY);
  doc.text(title, x + 6, y + 12);

  // Description
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, GRAY);
  const lines = doc.splitTextToSize(desc, w - 12);
  doc.text(lines, x + 6, y + 20);
}

// ─── PDF Generation ────────────────────────────────────────────────────────

export function generatePresentationPDF() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let pageNum = 0;

  // ════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ════════════════════════════════════════════════════════════
  drawRect(doc, 0, 0, 210, 297, PRIMARY);

  // Decorative circles
  doc.setFillColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.05 }));
  doc.circle(170, 40, 80, "F");
  doc.circle(30, 260, 60, "F");
  doc.setGState(doc.GState({ opacity: 1.0 }));

  // Logo area
  drawRoundedRect(doc, 75, 60, 60, 60, 10, WHITE);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.text("SAYELE", 105, 97, { align: "center" });

  // Title
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text("Presentation", 105, 155, { align: "center" });
  doc.text("Commerciale", 105, 170, { align: "center" });

  // Subtitle
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 215, 255);
  doc.text("Plateforme de Messagerie Multi-Canal", 105, 190, { align: "center" });
  doc.text("Propulsee par l'Intelligence Artificielle", 105, 200, { align: "center" });

  // Separator line
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(70, 215, 140, 215);

  // Contact info
  doc.setFontSize(11);
  doc.setTextColor(180, 200, 255);
  doc.text("www.sayele.co", 105, 230, { align: "center" });
  doc.text("contact@sayele.co", 105, 238, { align: "center" });

  // Date
  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  doc.setFontSize(10);
  doc.text(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), 105, 255, { align: "center" });

  // ════════════════════════════════════════════════════════════
  // PAGE 2 — SOMMAIRE
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;

  drawRect(doc, 0, 0, 210, 8, PRIMARY);

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("Sommaire", 105, 35, { align: "center" });

  const tocItems = [
    "A Propos de SAYELE",
    "Messagerie Multi-Canal",
    "Fonctionnalites Cles",
    "Intelligence Artificielle",
    "Securite & Conformite",
    "Administration & Gestion",
    "API & Integration",
    "Pourquoi Choisir SAYELE ?",
    "Offres & Tarification",
    "Contact",
  ];

  let tocY = 55;
  tocItems.forEach((item, idx) => {
    // Number circle
    drawRoundedRect(doc, 35, tocY - 5, 10, 10, 5, idx % 2 === 0 ? PRIMARY : ACCENT);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    setColor(doc, WHITE);
    doc.text(`${idx + 1}`, 40, tocY + 2, { align: "center" });

    // Title
    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    setColor(doc, DARK);
    doc.text(item, 52, tocY + 2);

    // Dotted line
    doc.setDrawColor(200, 200, 210);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(52 + doc.getTextWidth(item) + 3, tocY + 2, 165, tocY + 2);
    doc.setLineDashPattern([], 0);

    // Page number
    doc.setFontSize(11);
    setColor(doc, PRIMARY);
    doc.text(`${idx + 3}`, 170, tocY + 2);

    tocY += 18;
  });

  addFooterLine(doc);
  addPageNumber(doc, pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 3 — A PROPOS
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawRect(doc, 0, 0, 210, 8, PRIMARY);

  let y = sectionTitle(doc, "A Propos de SAYELE", 22);

  y = subTitle(doc, "SAYELE est une plateforme de messagerie professionnelle multi-canal concue pour les entreprises africaines et internationales. Elle centralise l'envoi, la reception et la gestion de tous vos canaux de communication dans une interface unique et performante.", y);

  y += 6;

  // Stats banner
  drawRoundedRect(doc, 20, y, 170, 35, 5, PRIMARY_LIGHT);
  const statsData = [
    { value: "10M+", label: "Messages\nEnvoyes" },
    { value: "4", label: "Canaux\nIntegres" },
    { value: "99.9%", label: "Disponibilite\nGarantie" },
    { value: "25+", label: "Pays\nCouverts" },
  ];
  const statsSpacing = 170 / 4;
  statsData.forEach((stat, i) => {
    const sx = 20 + i * statsSpacing + statsSpacing / 2;
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    setColor(doc, PRIMARY);
    doc.text(stat.value, sx, y + 15, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    doc.text(stat.label, sx, y + 22, { align: "center" });
  });

  y += 50;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("Notre Mission", 20, y);
  y += 8;

  const missionPoints = [
    "Simplifier la communication d'entreprise a travers tous les canaux numeriques",
    "Offrir une plateforme fiable, securisee et conforme aux reglementations",
    "Democratiser l'acces a l'IA conversationnelle pour toutes les entreprises",
    "Accompagner la transformation digitale des entreprises africaines",
  ];
  missionPoints.forEach((p) => {
    y = bulletPoint(doc, p, y);
  });

  y += 8;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("Nos Clients Types", 20, y);
  y += 8;

  const clientTypes = [
    "Banques et institutions financieres (OTP, alertes, notifications)",
    "Entreprises de e-commerce (confirmations de commande, suivi de livraison)",
    "Operateurs telecoms et fournisseurs de services",
    "Agences marketing et de communication",
    "Organisations gouvernementales et ONG",
  ];
  clientTypes.forEach((c) => {
    y = bulletPoint(doc, c, y);
  });

  addFooterLine(doc);
  addPageNumber(doc, pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 4 — MESSAGERIE MULTI-CANAL
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawRect(doc, 0, 0, 210, 8, PRIMARY);

  y = sectionTitle(doc, "Messagerie Multi-Canal", 22);
  y = subTitle(doc, "Envoyez et recevez des messages sur tous les canaux depuis une seule plateforme. Chaque canal est optimise pour maximiser la delivrabilite et l'engagement.", y);
  y += 4;

  const channels = [
    {
      name: "SMS",
      desc: "Envoi unitaire et en masse, suivi de delivrance en temps reel, DLR automatique, planification, integration avec les operateurs locaux (MTarget, Twilio, Vonage, Africa's Talking).",
      color: PRIMARY,
    },
    {
      name: "WhatsApp Business",
      desc: "Integration officielle via l'API WhatsApp Cloud de Meta. Envoi de messages riches (texte, images, documents), templates approuves, conversations bidirectionnelles.",
      color: ACCENT,
    },
    {
      name: "Telegram",
      desc: "Connexion via Telegram Bot API. Envoi automatise de messages, reception des reponses, support des commandes bot et des notifications push.",
      color: [0, 136, 204] as RGB,
    },
    {
      name: "Facebook Messenger",
      desc: "Integration Page Facebook pour la messagerie client. Gestion des conversations, reponses automatiques, support du service client via Messenger.",
      color: [66, 103, 178] as RGB,
    },
  ];

  channels.forEach((ch) => {
    // Channel header bar
    drawRoundedRect(doc, 20, y, 170, 8, 2, ch.color);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    setColor(doc, WHITE);
    doc.text(ch.name, 25, y + 6);
    y += 12;

    // Description
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    setColor(doc, DARK);
    const lines = doc.splitTextToSize(ch.desc, 165);
    doc.text(lines, 25, y);
    y += lines.length * 5 + 10;
  });

  y += 4;

  // Key differentiator box
  drawRoundedRect(doc, 20, y, 170, 30, 4, LIGHT_BG);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, PRIMARY);
  doc.text("Boite de Reception Unifiee", 30, y + 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, DARK);
  doc.text(
    doc.splitTextToSize(
      "Toutes les conversations de tous les canaux sont centralisees dans une seule boite de reception. Filtrez par canal, recherchez par contact, et ne manquez jamais un message.",
      150,
    ),
    30,
    y + 17,
  );

  addFooterLine(doc);
  addPageNumber(doc, pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 5 — FONCTIONNALITES CLES
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawRect(doc, 0, 0, 210, 8, PRIMARY);

  y = sectionTitle(doc, "Fonctionnalites Cles", 22);
  y = subTitle(doc, "SAYELE offre un ensemble complet d'outils pour gerer efficacement vos communications professionnelles.", y);
  y += 2;

  const features = [
    ["SMS en Masse", "Envoyez des campagnes a des milliers de contacts. Import CSV, planification, suivi en temps reel et rapports detailles."],
    ["Modeles de Messages", "Creez et gerez des modeles reutilisables avec variables dynamiques ({nom}, {date}, etc.)."],
    ["Gestion des Contacts", "Importez, organisez et segmentez vos contacts en groupes. Tags, champs personnalises, historique."],
    ["Automatisation", "Regles declenchees par mots-cles, premier message ou horaires. Reponses auto, transfert, ajout groupe."],
    ["Analytiques & Rapports", "Tableaux de bord en temps reel. Taux de delivrance, taux d'echec, volume par canal et par periode."],
    ["Webhooks", "Recevez des notifications en temps reel sur vos systemes pour chaque evenement (envoi, delivrance, echec, reception)."],
    ["API REST", "API complete pour integrer SAYELE a vos applications. Authentification par cle API, documentation Swagger."],
    ["Planification", "Programmez l'envoi de vos messages a une date et heure precises. Ideal pour les rappels et les campagnes."],
  ];

  // 2 columns, 4 rows
  const colW = 82;
  const cardH = 40;
  const gap = 6;
  for (let i = 0; i < features.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const fx = 20 + col * (colW + gap);
    const fy = y + row * (cardH + gap);
    featureCard(doc, features[i][0], features[i][1], fx, fy, colW);
  }

  addFooterLine(doc);
  addPageNumber(doc, pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 6 — INTELLIGENCE ARTIFICIELLE
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawRect(doc, 0, 0, 210, 8, PRIMARY);

  y = sectionTitle(doc, "Intelligence Artificielle", 22);
  y = subTitle(doc, "SAYELE integre des capacites d'IA avancees pour automatiser vos interactions clients et augmenter la productivite de vos equipes.", y);
  y += 4;

  // AI Features
  const aiFeatures = [
    {
      title: "Assistants IA Personnalises",
      points: [
        "Creez des chatbots intelligents adaptes a votre entreprise",
        "Base de connaissances configurable (FAQ, produits, services)",
        "Personnalite ajustable (professionnel, amical, formel)",
        "Widget embeddable sur votre site web",
        "API pour integration avec vos applications",
      ],
    },
    {
      title: "Formation & Entrainement",
      points: [
        "Definissez le ton et le style de communication de votre IA",
        "Exemples de questions/reponses pour guider l'apprentissage",
        "Vocabulaire et terminologie specifiques a votre secteur",
        "Directives de reponse et restrictions personnalisees",
        "Support multilingue avec detection automatique",
      ],
    },
    {
      title: "Taches Automatisees",
      points: [
        "L'IA peut executer des appels API en fonction du contexte",
        "Verification de statut de commande, prise de rendez-vous",
        "Integration avec vos systemes existants (CRM, ERP, etc.)",
        "Journaux d'execution detailles pour chaque tache",
      ],
    },
    {
      title: "Transfert Intelligent",
      points: [
        "Detection automatique des sujets necessitant un humain",
        "Routage vers le bon departement ou specialiste",
        "Resume automatique de la conversation pour l'agent",
        "Notification par email avec tout le contexte",
      ],
    },
  ];

  aiFeatures.forEach((feat) => {
    // Feature title
    drawRoundedRect(doc, 20, y, 170, 8, 2, ACCENT);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    setColor(doc, WHITE);
    doc.text(feat.title, 25, y + 6);
    y += 12;

    feat.points.forEach((p) => {
      y = bulletPoint(doc, p, y, 28);
    });
    y += 4;
  });

  // AI Email Assistant box
  if (y < 250) {
    drawRoundedRect(doc, 20, y, 170, 25, 4, PRIMARY_LIGHT);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    setColor(doc, PRIMARY);
    doc.text("Assistant Email IA", 30, y + 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(doc, DARK);
    doc.text(
      doc.splitTextToSize(
        "Integration Outlook pour la redaction intelligente d'emails. Suggestions de reponses, reformulation, correction et traduction automatique.",
        150,
      ),
      30,
      y + 17,
    );
  }

  addFooterLine(doc);
  addPageNumber(doc, pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 7 — SECURITE & CONFORMITE
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawRect(doc, 0, 0, 210, 8, PRIMARY);

  y = sectionTitle(doc, "Securite & Conformite", 22);
  y = subTitle(doc, "La securite de vos donnees et la conformite reglementaire sont au coeur de notre plateforme.", y);
  y += 4;

  const securityItems = [
    {
      title: "Chiffrement AES-256-GCM",
      desc: "Toutes les donnees sensibles (cles API, configurations des fournisseurs) sont chiffrees avec l'algorithme AES-256-GCM, le standard de securite utilise par les banques et les gouvernements.",
    },
    {
      title: "Controle d'Acces Base sur les Roles (RBAC)",
      desc: "Trois niveaux d'acces : Administrateur, Client et Lecteur. Chaque role a des permissions specifiques, garantissant que les utilisateurs n'accedent qu'aux fonctionnalites autorisees.",
    },
    {
      title: "Gestion des Opt-Out",
      desc: "Conformite totale avec les reglementations anti-spam. Detection automatique des mots-cles d'opt-out (STOP, ARRET), blocage des contacts desinscrits, journal d'activite complet.",
    },
    {
      title: "Journaux d'Audit",
      desc: "Tracabilite complete de toutes les actions : creation de cles API, modifications de credits, acces aux fournisseurs, changements de roles, etc.",
    },
    {
      title: "Limitation de Debit (Rate Limiting)",
      desc: "Protection contre les abus avec limitation intelligente des requetes API. Les tentatives excessives sont journalisees et bloquees automatiquement.",
    },
    {
      title: "Validation des Entrees",
      desc: "Toutes les donnees entrantes sont validees et nettoyees pour prevenir les injections et les attaques. Les numeros de telephone sont normalises au format E.164.",
    },
  ];

  securityItems.forEach((item) => {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    setColor(doc, PRIMARY);
    doc.text(item.title, 20, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(doc, DARK);
    const lines = doc.splitTextToSize(item.desc, 170);
    doc.text(lines, 20, y);
    y += lines.length * 4.5 + 8;
  });

  addFooterLine(doc);
  addPageNumber(doc, pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 8 — ADMINISTRATION & GESTION
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawRect(doc, 0, 0, 210, 8, PRIMARY);

  y = sectionTitle(doc, "Administration & Gestion", 22);
  y = subTitle(doc, "Des outils puissants pour gerer vos clients, credits et operations au quotidien.", y);
  y += 4;

  // Admin features with table
  autoTable(doc, {
    startY: y,
    head: [["Fonctionnalite", "Description"]],
    body: [
      ["Gestion des Clients", "Creation, activation, suspension de comptes clients. Attribution de fournisseurs par canal."],
      ["Credits & Facturation", "Systeme de credits prepaye par canal. Achat de packages, historique des transactions, alertes solde bas."],
      ["Gestion des Utilisateurs", "Attribution des roles, assignation aux clients, gestion des acces et permissions."],
      ["Tableau de Bord Admin", "Vue d'ensemble des statistiques systeme : messages, clients, revenus, activite."],
      ["Rapports de Campagne", "Export PDF et Excel des resultats de campagne avec metriques detaillees."],
      ["Fournisseurs Multi-Provider", "Configuration de plusieurs fournisseurs SMS/WhatsApp par client pour redondance et optimisation."],
      ["Formulaire d'Inscription", "Processus d'onboarding structure avec validation et approbation par l'administrateur."],
      ["Interface Bilingue", "Interface complete en francais et anglais, avec changement de langue instantane."],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [PRIMARY[0], PRIMARY[1], PRIMARY[2]],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [DARK[0], DARK[1], DARK[2]],
    },
    alternateRowStyles: {
      fillColor: [LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]],
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: 120 },
    },
    margin: { left: 20, right: 20 },
  });

  addFooterLine(doc);
  addPageNumber(doc, pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 9 — API & INTEGRATION
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawRect(doc, 0, 0, 210, 8, PRIMARY);

  y = sectionTitle(doc, "API & Integration", 22);
  y = subTitle(doc, "Integrez SAYELE a vos applications existantes grace a notre API REST complete et nos webhooks en temps reel.", y);
  y += 4;

  // API endpoints table
  autoTable(doc, {
    startY: y,
    head: [["Endpoint", "Methode", "Description"]],
    body: [
      ["/api/v1/sms/send", "POST", "Envoyer un message (SMS, WhatsApp, Telegram, Messenger)"],
      ["/api/v1/sms/bulk", "POST", "Envoyer une campagne en masse"],
      ["/api/v1/contacts", "GET/POST", "Gerer les contacts et groupes"],
      ["/api/v1/templates", "GET/POST", "Gerer les modeles de messages"],
      ["/api/v1/messages", "GET", "Consulter l'historique des messages"],
      ["/api/v1/ai/chat", "POST", "Interagir avec un assistant IA"],
      ["/api/v1/webhooks", "POST", "Recevoir les notifications d'evenements"],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [DARK[0], DARK[1], DARK[2]],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      font: "courier",
      textColor: [DARK[0], DARK[1], DARK[2]],
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 25, halign: "center" },
      2: { cellWidth: 90, font: "helvetica" },
    },
    margin: { left: 20, right: 20 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 12;

  // Code example
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("Exemple d'Integration", 20, y);
  y += 8;

  // Code block background
  drawRoundedRect(doc, 20, y, 170, 48, 4, DARK);

  doc.setFontSize(8);
  doc.setFont("courier", "normal");
  doc.setTextColor(0, 230, 118);
  doc.text("// Envoi d'un SMS via l'API SAYELE", 28, y + 8);

  doc.setTextColor(200, 200, 200);
  const codeLines = [
    'curl -X POST https://api.sayele.co/api/v1/sms/send \\',
    '  -H "Authorization: Bearer sk_live_votre_cle" \\',
    '  -H "Content-Type: application/json" \\',
    '  -d \'{',
    '    "to": "+22890001234",',
    '    "message": "Bonjour! Votre code est 1234",',
    '    "channel": "sms"',
    '  }\'',
  ];
  codeLines.forEach((line, i) => {
    doc.text(line, 28, y + 14 + i * 4.5);
  });

  y += 60;

  // Webhooks section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("Webhooks en Temps Reel", 20, y);
  y += 6;

  const webhookEvents = [
    "message.sent — Confirme l'envoi reussi d'un message",
    "message.delivered — Confirme la livraison au destinataire",
    "message.failed — Notifie un echec d'envoi avec la raison",
    "message.received — Notifie la reception d'un message entrant",
  ];
  webhookEvents.forEach((e) => {
    y = bulletPoint(doc, e, y);
  });

  addFooterLine(doc);
  addPageNumber(doc, pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 10 — POURQUOI SAYELE
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawRect(doc, 0, 0, 210, 8, PRIMARY);

  y = sectionTitle(doc, "Pourquoi Choisir SAYELE ?", 22);
  y += 4;

  const advantages = [
    {
      title: "Plateforme Tout-en-Un",
      desc: "SMS, WhatsApp, Telegram et Messenger dans une seule interface. Plus besoin de jongler entre plusieurs outils.",
    },
    {
      title: "IA Integree",
      desc: "Chatbots intelligents, generation automatique de contenu, assistant email — l'IA est au coeur de chaque fonctionnalite.",
    },
    {
      title: "Adapte a l'Afrique",
      desc: "Integration native avec les operateurs locaux (MTarget, Africa's Talking), support du format E.164, interface bilingue francais/anglais.",
    },
    {
      title: "Securite de Niveau Entreprise",
      desc: "Chiffrement AES-256, RBAC, journaux d'audit, conformite anti-spam, limitation de debit — votre securite est notre priorite.",
    },
    {
      title: "API Ouverte & Extensible",
      desc: "API REST complete, webhooks en temps reel, widget embeddable — integrez SAYELE a n'importe quel systeme existant.",
    },
    {
      title: "Support & Accompagnement",
      desc: "Documentation complete, assistance technique reactive, et accompagnement personnalise pour votre deploiement.",
    },
  ];

  advantages.forEach((adv, i) => {
    const isEven = i % 2 === 0;
    drawRoundedRect(doc, 20, y, 170, 28, 4, isEven ? LIGHT_BG : WHITE);

    // Number badge
    drawRoundedRect(doc, 25, y + 4, 8, 8, 4, PRIMARY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(doc, WHITE);
    doc.text(`${i + 1}`, 29, y + 10, { align: "center" });

    // Title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    setColor(doc, DARK);
    doc.text(adv.title, 38, y + 10);

    // Description
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    const lines = doc.splitTextToSize(adv.desc, 145);
    doc.text(lines, 38, y + 17);

    y += 34;
  });

  addFooterLine(doc);
  addPageNumber(doc, pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 11 — OFFRES & TARIFICATION
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;
  drawRect(doc, 0, 0, 210, 8, PRIMARY);

  y = sectionTitle(doc, "Offres & Tarification", 22);
  y = subTitle(doc, "Choisissez le forfait adapte a vos besoins. Systeme de credits prepaye flexible avec tarification par canal.", y);
  y += 4;

  // Pricing table
  autoTable(doc, {
    startY: y,
    head: [["Forfait", "Credits", "Prix", "Ideal Pour"]],
    body: [
      ["Starter", "500 credits", "5 000 FCFA", "Petites entreprises, tests"],
      ["Business", "2 500 credits", "20 000 FCFA", "PME, campagnes regulieres"],
      ["Pro", "7 500 credits", "50 000 FCFA", "Grandes campagnes, multi-canal"],
      ["Enterprise", "25 000 credits", "150 000 FCFA", "Grands comptes, volume eleve"],
      ["Ultra", "75 000 credits", "400 000 FCFA", "Operateurs, agregateurs"],
      ["Mega", "200 000 credits", "900 000 FCFA", "Usage intensif, API"],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [ACCENT[0], ACCENT[1], ACCENT[2]],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [DARK[0], DARK[1], DARK[2]],
    },
    alternateRowStyles: {
      fillColor: [LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35 },
      1: { cellWidth: 35, halign: "center" },
      2: { cellWidth: 40, halign: "center" },
      3: { cellWidth: 60 },
    },
    margin: { left: 20, right: 20 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 12;

  // Per-channel pricing
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("Cout par Canal", 20, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [["Canal", "Credits / Message", "Notes"]],
    body: [
      ["SMS National", "1 credit", "Togo, Benin, Cote d'Ivoire et plus"],
      ["SMS International", "2-5 credits", "Selon la destination"],
      ["WhatsApp", "1-2 credits", "Messages template ou session"],
      ["Telegram", "0.5 credit", "Via Bot API"],
      ["Facebook Messenger", "1 credit", "Via Page API"],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [PRIMARY[0], PRIMARY[1], PRIMARY[2]],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [DARK[0], DARK[1], DARK[2]],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45 },
      1: { cellWidth: 40, halign: "center" },
      2: { cellWidth: 85 },
    },
    margin: { left: 20, right: 20 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 10;

  // Note
  drawRoundedRect(doc, 20, y, 170, 20, 4, PRIMARY_LIGHT);
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  setColor(doc, PRIMARY);
  doc.text(
    doc.splitTextToSize(
      "Tarification personnalisee disponible pour les gros volumes. Contactez notre equipe commerciale pour obtenir un devis sur mesure adapte a vos besoins specifiques.",
      155,
    ),
    28,
    y + 8,
  );

  addFooterLine(doc);
  addPageNumber(doc, pageNum);

  // ════════════════════════════════════════════════════════════
  // PAGE 12 — CONTACT / CTA
  // ════════════════════════════════════════════════════════════
  doc.addPage();
  pageNum++;

  // Full page gradient-like effect
  drawRect(doc, 0, 0, 210, 150, PRIMARY);
  drawRect(doc, 0, 150, 210, 147, WHITE);

  // Title
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text("Pret a Commencer ?", 105, 60, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 215, 255);
  doc.text("Contactez-nous pour une demonstration", 105, 75, { align: "center" });
  doc.text("personnalisee de la plateforme SAYELE.", 105, 85, { align: "center" });

  // Decorative circles
  doc.setFillColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.05 }));
  doc.circle(40, 30, 50, "F");
  doc.circle(180, 120, 40, "F");
  doc.setGState(doc.GState({ opacity: 1.0 }));

  // Contact cards
  const contactY = 115;
  drawRoundedRect(doc, 25, contactY, 160, 20, 4, WHITE);
  doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(25, contactY, 160, 20, 4, 4, "S");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, PRIMARY);
  doc.text("Site Web", 35, contactY + 8);
  doc.setFont("helvetica", "normal");
  setColor(doc, DARK);
  doc.text("www.sayele.co", 35, contactY + 15);

  doc.setFont("helvetica", "bold");
  setColor(doc, PRIMARY);
  doc.text("Email", 115, contactY + 8);
  doc.setFont("helvetica", "normal");
  setColor(doc, DARK);
  doc.text("contact@sayele.co", 115, contactY + 15);

  // Second row of contact
  const contact2Y = contactY + 28;
  drawRoundedRect(doc, 25, contact2Y, 160, 20, 4, WHITE);
  doc.setDrawColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
  doc.roundedRect(25, contact2Y, 160, 20, 4, 4, "S");

  doc.setFont("helvetica", "bold");
  setColor(doc, PRIMARY);
  doc.text("Telephone", 35, contact2Y + 8);
  doc.setFont("helvetica", "normal");
  setColor(doc, DARK);
  doc.text("+228 XX XX XX XX", 35, contact2Y + 15);

  doc.setFont("helvetica", "bold");
  setColor(doc, PRIMARY);
  doc.text("Adresse", 115, contact2Y + 8);
  doc.setFont("helvetica", "normal");
  setColor(doc, DARK);
  doc.text("Lome, Togo", 115, contact2Y + 15);

  // Bottom section
  y = 190;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("Prochaines Etapes", 105, y, { align: "center" });
  y += 12;

  const steps = [
    "1.  Demandez une demonstration gratuite de la plateforme",
    "2.  Choisissez le forfait adapte a vos besoins",
    "3.  Configurez vos canaux et importez vos contacts",
    "4.  Lancez vos premieres campagnes en quelques minutes",
  ];
  steps.forEach((step) => {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    setColor(doc, DARK);
    doc.text(step, 105, y, { align: "center" });
    y += 9;
  });

  y += 10;
  // CTA box
  drawRoundedRect(doc, 45, y, 120, 18, 6, ACCENT);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text("Demander une Demo Gratuite", 105, y + 12, { align: "center" });

  // Footer
  y = 280;
  doc.setFontSize(8);
  setColor(doc, GRAY);
  doc.text(`SAYELE Message | Presentation Commerciale | ${dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}`, 105, y, { align: "center" });
  doc.text("Document confidentiel — Usage commercial uniquement", 105, y + 5, { align: "center" });

  // ─── Save ────────────────────────────────────────────────────────────────────
  doc.save("SAYELE-Presentation-Commerciale.pdf");
}

import { CourseStructure, ItemType } from './types';
import { 
  MessageSquare, 
  BookOpen, 
  List, 
  FolderOpen, 
  FileText, 
  CheckSquare, 
  PenTool, 
  Link,
  LucideIcon
} from 'lucide-react';

export const ICON_MAP: Record<ItemType, LucideIcon> = {
  [ItemType.FORUM]: MessageSquare,
  [ItemType.PAGE]: FileText,
  [ItemType.GLOSSARY]: List,
  [ItemType.FOLDER]: FolderOpen,
  [ItemType.QUIZ]: CheckSquare,
  [ItemType.ASSIGNMENT]: PenTool,
  [ItemType.URL]: Link,
  [ItemType.FILE]: BookOpen,
};

// Helper to generate standard internal structure for units
const generateStandardUnitItems = (unitId: string, unitTitle: string, unitContent: string, workshopTopic: string) => [
  {
    id: `${unitId}-map`,
    title: "Mapa conceptual de la unitat",
    description: "Visió panoràmica dels conceptes clau.",
    type: ItemType.FILE,
    promptContext: `Crea un esquema textual per a un mapa conceptual sobre: ${unitTitle}. Continguts: ${unitContent}`
  },
  {
    id: `${unitId}-objectives`,
    title: "Objectius d'Aprenentatge",
    description: "Resum dels punts clau a assolir.",
    type: ItemType.PAGE,
    promptContext: `Resumeix en 3 punts clau què s'espera que l'alumne aprengui en aquesta unitat: ${unitTitle}. Continguts: ${unitContent}.`
  },
  {
    id: `${unitId}-quiz-init`,
    title: "Qüestionari: Què saps?",
    description: "Avaluació inicial per determinar el nivell previ.",
    type: ItemType.QUIZ,
    promptContext: `Genera 5 preguntes tipus test per avaluar coneixements previs sobre: ${unitTitle}.`
  },
  {
    id: `${unitId}-lesson`,
    title: "Lliçó: Continguts Teòrics",
    description: `Desenvolupament teòric: ${unitContent}`,
    type: ItemType.PAGE,
    promptContext: `Escriu una introducció didàctica i estructurada sobre: ${unitContent}. Inclou exemples de cultura plàstica o cinema.`
  },
  {
    id: `${unitId}-forum`,
    title: `Fòrum de Debat: ${unitTitle}`,
    description: "Espai de seguiment per debatre idees i resoldre dubtes sobre la teoria.",
    type: ItemType.FORUM,
    promptContext: `Proposa un tema de debat provocador relacionat amb "${unitContent}" i redacta el missatge inicial del professor per animar la participació dels alumnes.`
  },
  {
    id: `${unitId}-activities`,
    title: "Activitats (Graus 1, 2 i 3)",
    description: "Exercicis dividits per nivells de dificultat (Directe, Inferència, Recerca).",
    type: ItemType.ASSIGNMENT,
    promptContext: `Proposa 3 activitats per a estudiants sobre ${unitTitle}: una de resposta directa, una de deducció/relació i una de recerca externa.`
  },
  {
    id: `${unitId}-workshop`,
    title: `Taller Pràctic: ${workshopTopic}`,
    description: "Espai per al lliurament del projecte pràctic final.",
    type: ItemType.ASSIGNMENT,
    promptContext: `Redacta les instruccions pas a pas per al taller: ${workshopTopic}. Inclou criteris d'avaluació.`
  },
  {
    id: `${unitId}-reflection`,
    title: "Seguiment: Diari d'Aprenentatge",
    description: "Reflexió personal sobre el procés de creació del taller.",
    type: ItemType.ASSIGNMENT,
    promptContext: `Crea una fitxa de seguiment amb 4 preguntes reflexives perquè l'alumne analitzi les dificultats trobades i els aprenentatges adquirits durant el taller: "${workshopTopic}".`
  },
  {
    id: `${unitId}-quiz-final`,
    title: "Autoavaluació",
    description: "Comprova el teu progrés.",
    type: ItemType.QUIZ,
    promptContext: `Genera 10 preguntes d'elecció múltiple per avaluar els continguts: ${unitContent}.`
  }
];

export const COURSE_DATA: CourseStructure = {
  general: {
    id: 'general',
    title: 'Secció General del Curs',
    description: 'Recursos transversals i comunicació.',
    items: [
      {
        id: 'gen-forum',
        title: "Fòrum d'avisos i notícies",
        description: "Per a comunicacions del professor.",
        type: ItemType.FORUM,
        promptContext: "Redacta un missatge de benvinguda al curs de Cultura Audiovisual per al fòrum d'avisos."
      },
      {
        id: 'gen-guide',
        title: "Guia docent",
        description: "Presentació de la matèria i objectius.",
        type: ItemType.FILE,
        promptContext: "Crea un resum dels objectius d'aprenentatge per a un curs de Cultura Audiovisual i Multimèdia."
      },
      {
        id: 'gen-glossary',
        title: "Glossari de termes",
        description: "Conceptes clau com iconicitat, diafragma, story board.",
        type: ItemType.GLOSSARY,
        promptContext: "Defineix breument els termes: Iconicitat, Diafragma, Story board, Enquadrament, Píxel."
      },
      {
        id: 'gen-biblio',
        title: "Bibliografia i Recursos",
        description: "Recull de les fonts de consulta generals.",
        type: ItemType.URL,
        promptContext: "Llista 5 recursos web o llibres essencials per aprendre sobre llenguatge audiovisual i cinema."
      }
    ]
  },
  units: [
    {
      id: 'u1',
      title: 'Unitat 1: Imatge i significat',
      description: 'Evolució i funció de la imatge.',
      items: generateStandardUnitItems(
        'u1', 
        'Imatge i significat', 
        'Evolució de la imatge fins a l\'era digital, funcions de la imatge i la construcció social de la realitat',
        'Construcció d\'una càmera estenopeica'
      )
    },
    {
      id: 'u2',
      title: 'Unitat 2: La imatge fixa i els seus llenguatges',
      description: 'Codis visuals, fotografia i còmic.',
      items: generateStandardUnitItems(
        'u2',
        'La imatge fixa',
        'Codis de la imatge, nivells d\'iconicitat, el cartell, el còmic i la càmera fotogràfica',
        'Retoc digital d\'imatges (Photoshop/GIMP)'
      )
    },
    {
      id: 'u3',
      title: 'Unitat 3: La imatge en moviment. El cinema',
      description: 'Cinema, animació i narrativa visual.',
      items: generateStandardUnitItems(
        'u3',
        'La imatge en moviment',
        'Fonaments del cinema, el guió (literari i tècnic), l\'story board i gèneres d\'animació',
        'Gravació i muntatge d\'una seqüència d\'animació'
      )
    },
    {
      id: 'u4',
      title: 'Unitat 4: Integració de so i imatge',
      description: 'Producció multimèdia i àudio.',
      items: generateStandardUnitItems(
        'u4',
        'Integració so i imatge',
        'Funció expressiva del so, sistemes de registre digital, formats (MP3, WAV, AVI) i edició',
        'Producció d\'un joc multimèdia interactiu'
      )
    },
    {
      id: 'u5',
      title: 'Unitat 5: Els mitjans de comunicació',
      description: 'TV, ràdio i internet.',
      items: generateStandardUnitItems(
        'u5',
        'Els mitjans de comunicació',
        'Llenguatge televisiu, programació radiofònica i la democratització de la informació a Internet',
        'Simulació d\'una tertúlia o magazin'
      )
    },
    {
      id: 'u6',
      title: 'Unitat 6: La publicitat',
      description: 'Publicitat, propaganda i màrqueting.',
      items: generateStandardUnitItems(
        'u6',
        'La publicitat',
        'Diferència entre publicitat i propaganda, anàlisi de l\'spot, publicitat social',
        'Elaboració d\'un anunci publicitari'
      )
    },
    {
      id: 'u7',
      title: 'Unitat 7: Anàlisi de la imatge',
      description: 'Lectura crítica i valors estètics.',
      items: generateStandardUnitItems(
        'u7',
        'Anàlisi de la imatge',
        'Lectura denotativa i connotativa, valors estètics i de significat, influència mediàtica',
        'Anàlisi de programari multimèdia'
      )
    }
  ]
};
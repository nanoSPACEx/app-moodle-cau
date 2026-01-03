export enum ItemType {
  FORUM = 'forum',
  PAGE = 'page',
  GLOSSARY = 'glossary',
  FOLDER = 'folder',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  URL = 'url',
  FILE = 'file'
}

export interface CourseItem {
  id: string;
  title: string;
  description: string;
  type: ItemType;
  promptContext?: string; // Context for AI generation
}

export interface CourseUnit {
  id: string;
  title: string;
  description: string;
  items: CourseItem[];
}

export interface CourseStructure {
  general: CourseUnit;
  units: CourseUnit[];
}
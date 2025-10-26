// FIX: Define and export interfaces for data models to ensure type safety across the application.
export interface Tag {
  text: string;
  color: string;
}

export interface ScheduleItem {
  id: number;
  title: string;
  assignees: string[];
  tags: Tag[];
}

export interface Payment {
  id: number;
  title: string;
  amount: number;
  status: string;
  tags: Tag[];
}

export interface Challenge {
  id: number;
  title: string;
  description: string;
  tags: Tag[];
}

export interface Advantage {
  id: number;
  title: string;
  description: string;
  tags: Tag[];
}

export interface Contact {
  id: number;
  name: string;
  role: string;
  tags: Tag[];
}

export interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string;
  tags: Tag[];
}

export interface ListDetail {
  bgColor: string;
  createdAt: string;
  id: number;
  label: string;
  textColor: string;
}

export interface RawListPage {
  lists: ListDetail[];
  total: number;
}

export class List {
  lists: ListDetail[];
  total: number;

  constructor(rawData: RawListPage) {
    this.lists = rawData.lists;
    this.total = rawData.total;
  }
}

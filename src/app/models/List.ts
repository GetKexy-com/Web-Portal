export interface ListDetail {
  bgColor: string;
  createdAt: string;
  id: number;
  label: string;
  textColor: string;
}

export interface RawListData {
  lists: ListDetail[];
  total: number;
}

export class List {
  lists: ListDetail[];
  total: number;

  constructor(rawData: RawListData) {
    this.lists = rawData.lists;
    this.total = rawData.total;
  }
}

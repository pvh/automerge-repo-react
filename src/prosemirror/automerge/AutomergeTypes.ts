export type AutomergeTransaction = ChangeSet[]

export type ChangeSetDeletion = {
  pos: number;
  val: string;
}

export type ChangeSetAddition = {
  start: number;
  end: number;
};

export type ChangeSet = {
  add: ChangeSetAddition[];
  del: ChangeSetDeletion[];
};

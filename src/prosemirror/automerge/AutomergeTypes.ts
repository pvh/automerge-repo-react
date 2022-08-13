
export type AutomergeDoc = any; // TODO (this should be <T>)

export type AutomergeText = any;

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

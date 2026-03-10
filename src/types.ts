export interface NodeRow {
  id: number;
  label: string;
  parent_id: number | null;
  created_at: string;
}

export interface TreeNode {
  id: number;
  label: string;
  children: TreeNode[];
}

export interface CreateNodeBody {
  label: string;
  parent_id?: number | null;
}

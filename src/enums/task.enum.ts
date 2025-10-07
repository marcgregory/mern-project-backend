export const TaskStatusEnum = {
  BACKLOG: "BACKLOG",
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  IN_REVIEW: "IN_REVIEW",
  DONE: "DONE",
} as const;

export const TaskPriorityEnum = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;

export type TaskStatusEnumType = keyof typeof TaskStatusEnum; // keyof union type containing all property names
export type TaskPriorityEnumType = keyof typeof TaskPriorityEnum; // keyof union type containing all property names

//"GOOGLE" | "GITHUB" | "FACEBOOK" | "EMAIL"

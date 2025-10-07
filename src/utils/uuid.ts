import { v4 as uuidv4 } from "uuid";

export function generateInviteCode() {
  //6fcd4f90-13ab-4b67-a8df-222fb2d1c799 to 6fcd4f90
  //.replace(/-/g, "") removes all dashes using a regular expression
  //Takes only the first 8 characters from the cleaned-up UUID.
  return uuidv4().replace(/-/g, "").substring(0, 8);
}

export function generateTaskCode() {
  //returns  task-6fc
  return `task-${uuidv4().replace(/-/g, "").substring(0, 3)}`;
}

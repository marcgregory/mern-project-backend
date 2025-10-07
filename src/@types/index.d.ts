import { UserDocument } from "../models/user.model";

declare global {
  //  declare global { ... } - This tells TypeScript: “I want to add something to global types (not just locally in this file).”
  // namespace Express { ... } - You are extending (augmenting) the built-in Express namespace — specifically the User interface that Passport uses
  // interface User extends UserDocument { _id?: any; } You override the existing Express.User type to now include your own UserDocument fields (like name, email, etc.)
  //You also add _id (optional), since MongoDB users always have that.
  namespace Express {
    interface User extends UserDocument {
      _id?: any;
    }
  }
}

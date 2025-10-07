export const ProviderEnum = {
  GOOGLE: "GOOGLE",
  GITHUB: "GITHUB",
  FACEBOOK: "FACEBOOK",
  EMAIL: "EMAIL",
};

export type ProviderEnumType = keyof typeof ProviderEnum; // keyof union type containing all property names
//"GOOGLE" | "GITHUB" | "FACEBOOK" | "EMAIL"

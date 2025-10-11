import mongoose from "mongoose";
export const supportsTransactionsCheck = () => {
  const connection = mongoose.connection as any;

  return (
    connection.readyState === 1 &&
    connection.client?.topology?.description?.type !== "Single"
  );
};

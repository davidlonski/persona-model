/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function getDb() {
  return {
    query: {
      reminders: {
        findMany: async () => [],
        findFirst: async () => null,
      }
    },
    update: (table?: any) => ({
      set: (values?: any) => ({
        where: async (condition?: any) => {}
      })
    }),
    insert: () => ({
      values: async () => {}
    }),
    select: () => ({
      from: () => ({
        orderBy: async () => []
      })
    })
  };
}

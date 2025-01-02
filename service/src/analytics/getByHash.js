export const getByHash = async (postgres, table, hash) => {
    const query = `SELECT * FROM ${table} WHERE hash = $1`;
    const result = await postgres.query(query, [hash]);
    return result?.rows[0]?.id;
};

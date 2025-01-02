import pg from 'pg';

export const adjustPgTypes = () => {
    pg.types.setTypeParser(1700, parseFloat);
}

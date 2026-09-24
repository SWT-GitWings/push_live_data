/*
|--------------------------------------------------------------------------
| Local Users (in-memory, no database) — credentials loaded from .env
|--------------------------------------------------------------------------
*/

const users = [
    {
        id: Number(process.env.USER1_ID),
        username: process.env.USER1_USERNAME,
        password: process.env.USER1_PASSWORD,
        name: process.env.USER1_NAME,
        status: Number(process.env.USER1_STATUS)
    },
    {
        id: Number(process.env.USER2_ID),
        username: process.env.USER2_USERNAME,
        password: process.env.USER2_PASSWORD,
        name: process.env.USER2_NAME,
        status: Number(process.env.USER2_STATUS)
    }
];

module.exports = users;

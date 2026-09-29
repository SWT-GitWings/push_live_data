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
        status: Number(process.env.USER1_STATUS),
        type: Number(process.env.USER1_TYPE)
    },
    {
        id: Number(process.env.USER2_ID),
        username: process.env.USER2_USERNAME,
        password: process.env.USER2_PASSWORD,
        name: process.env.USER2_NAME,
        status: Number(process.env.USER2_STATUS),
        type: Number(process.env.USER2_TYPE)
    },
    {
        id: Number(process.env.USER3_ID),
        username: process.env.USER3_USERNAME,
        password: process.env.USER3_PASSWORD,
        name: process.env.USER3_NAME,
        status: Number(process.env.USER3_STATUS),
        type: Number(process.env.USER3_TYPE)
    },
    {
        id: Number(process.env.USER4_ID),
        username: process.env.USER4_USERNAME,
        password: process.env.USER4_PASSWORD,
        name: process.env.USER4_NAME,
        status: Number(process.env.USER4_STATUS),
        type: Number(process.env.USER4_TYPE)
    },
    {
        id: Number(process.env.USER5_ID),
        username: process.env.USER5_USERNAME,
        password: process.env.USER5_PASSWORD,
        name: process.env.USER5_NAME,
        status: Number(process.env.USER5_STATUS),
        type: Number(process.env.USER5_TYPE)
    }
];

module.exports = users;
# Finora — Personal Finance Tracker

A MERN personal finance tracker with JWT authentication, transaction CRUD, budgets, analytics, filters and CSV export.

## Requirements
- Node.js 18+
- MongoDB Atlas account (recommended) or local MongoDB

## 1. Configure MongoDB
Create a free MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas.
Create a database user, allow your current IP in Network Access, and copy the Node.js connection string.
Replace `<password>` in the connection string with your database user's password.

## 2. Start the backend
```bash
cd server
copy .env.example .env
npm install
npm run dev
```
Open `server/.env` and set:
- `MONGO_URI` to your MongoDB connection string
- `JWT_SECRET` to a long random secret
- `PORT=5000`

## 3. Start the frontend (new terminal)
```bash
cd client
copy .env.example .env
npm install
npm run dev
```
Open the Vite URL (normally http://localhost:5173).

## Included features
- Register, login and logout with JWT
- Private user-specific transactions and budgets
- Add and delete income/expense transactions
- Dashboard income, expense and balance cards
- Category spending pie chart and monthly trend bar chart
- Search, type and category filters
- Monthly budget creation and progress
- CSV export
- Responsive layout, animated cards and page transitions

## Important
This is a student project starter. Use demo/test data only. Do not enter real bank credentials or sensitive financial information.

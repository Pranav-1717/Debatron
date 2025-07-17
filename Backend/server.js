const express = require('express');
const dotenv = require('dotenv');
const authroutes = require('./routes/auth_routes');
const morgan = require('morgan')
dotenv.config();
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());   
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use('/api/auth', authroutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
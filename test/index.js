import * as dotenv from 'dotenv'
dotenv.config()

import { Qris } from "qris-mutasi";

// const { Qris } = require("qris-mutasi");

(async () => {
  const qris = new Qris(process.env.EMAIL, process.env.PASSWORD);
  const mutasi = await qris.mutasi();
  console.log(mutasi);
})();
# Qris Mutasi

Qris Mutasi is a TypeScript library used to retrieve transaction data from [Merchant QRIS Dashboard](https://merchant.qris.id/m/). This library uses [cheerio](https://github.com/cheeriojs/cheerio) to scrape data from the dashboard.

## Installation

Use the package manager [npm](https://www.npmjs.com/) to install Qris Mutasi.

```bash
npm install qris-mutasi
```
or using yarn
```bash
yarn add qris-mutasi
```

## Usage

### Importing the Library

```typescript
import { Qris } from "qris-mutasi";
```
or commonjs

```typescript
const { Qris } = require("qris-mutasi");
```
### Creating a Qris Object

```typescript
const qris = new Qris(email, password);
```

### Retrieving Transaction Data

```typescript
const data = await qris.mutasi(nominal, from_date, to_date);
```

### Parameters

| Parameter  | Type                      | Description                                                                                                             |
|------------|---------------------------|-------------------------------------------------------------------------------------------------------------------------|
| nominal    | string (optional)         | Filter transactions by the given nominal.                                                                               |
| from_date  | string \| null (optional) | The starting date to filter the transactions. The date format should be yyyy-mm-dd. If null, the current date is used. |
| to_date    | string \| null (optional) | The end date to filter the transactions. The date format should be yyyy-mm-dd. If null, the current date is used.      |

### Return Value

The function `mutasi()` returns an array of objects representing the transaction data. Each object has the following properties:

| Property            | Type      | Description                                                                           |
|---------------------|-----------|---------------------------------------------------------------------------------------|
| id                  | number    | The ID of the transaction.                                                            |
| timestamp           | number    | The timestamp of the transaction in milliseconds since epoch.                         |
| tanggal             | string    | The date and time of the transaction in the format "yyyy-mm-dd hh:mm:ss".             |
| nominal             | string    | The nominal amount of the transaction.                                                |
| status              | string    | The status of the transaction.                                                        |
| inv_id              | number    | The invoice ID of the transaction.                                                     |
| tanggal_settlement  | string    | The date of the transaction settlement in the format "yyyy-mm-dd".                    |
| asal_transaksi     | string    | The origin of the transaction.                                                        |
| nama_costumer       | string    | The name of the customer.                                                              |
| rrn                 | string    | The reference number of the transaction.                                               |

### Example

```typescript
import { Qris } from "qris";

const email = "your_email";
const password = "your_password";
const nominal = "10000";
const from_date = "2023-05-01";
const to_date = "2023-05-07";

const qris = new Qris(email, password);
const data = await qris.mutasi(nominal, from_date, to_date);

console.log(data);
```

## License
[MIT](https://choosealicense.com/licenses/mit/)
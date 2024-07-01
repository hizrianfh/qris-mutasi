import * as cheerio from 'cheerio';
import * as fs from 'fs';

export class Qris {
    private readonly baseUrl: string = "https://merchant.qris.online";
    private readonly user: string;
    private readonly pass: string;
    private readonly cookieFile: string;
    private static readonly DATE_FORMAT: string = 'yyyy-MM-dd';

    constructor(user: string, pass: string) {
        this.user = user;
        this.pass = pass;
        this.cookieFile = `${this.hash(this.user + this.pass)}_cookie.txt`;
    }

    private static validateInputs(fromDate: string | null, toDate: string | null, limit: number | null, today: string) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if ((fromDate && !dateRegex.test(fromDate)) || (toDate && !dateRegex.test(toDate))) {
            throw new Error(`Invalid date format. Expected format: ${today}`);
        }
        if (limit !== null && (limit < 10 || limit > 300 || !Number.isInteger(limit))) {
            throw new Error("Limit must be between 10 and 300");
        }
    }

    private hash(input: string): string {
        let hash = 0, chr;
        for (let i = 0; i < input.length; i++) {
            chr = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash.toString();
    }

    private static formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    public async mutasi(filter: string | null = null, fromDate: string | null = null, toDate: string | null = null, limit: number = 20): Promise<any[]> {
        const today = Qris.formatDate(new Date());
        Qris.validateInputs(fromDate, toDate, limit, today);

        const fromDateValue = fromDate || Qris.formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
        const toDateValue = toDate || today;

        let tryCount = 0;

        while (tryCount < 3) {
            const response = await this.request('POST', `${this.baseUrl}/m/kontenr.php?idir=pages/historytrx.php`, this.filterData(filter, fromDateValue, toDateValue, limit));

            if (response.includes("Logout")) {
                const data = this.parseHistory(response);
                if (data) {
                    return data;
                }
            } else {
                await this.login();
                tryCount++;
            }
        }

        throw new Error("Failed to login after 3 attempts");
    }

    private parseHistory(response: string): any[] {
        const $ = cheerio.load(response);
        return $("#history > tbody > tr").map((_, row) => {
            const cols = $(row).find("td").map((_, col) => $(col).text().trim()).get();
            return cols.length >= 9 ? {
                id: parseInt(cols[0], 10),
                timestamp: new Date(cols[1]).getTime() / 1000,
                tanggal: cols[1],
                nominal: parseInt(cols[2].replace(".", ""), 10),
                status: cols[3],
                inv_id: parseInt(cols[4], 10),
                tanggal_settlement: cols[5],
                asal_transaksi: cols[6],
                nama_costumer: cols[7],
                rrn: cols[8],
            } : null;
        }).get().filter(Boolean);
    }

    private async request(method: 'GET' | 'POST', url: string, data?: FormData): Promise<string> {
        const headers = new Headers();
        headers.append("Cookie", this.getCookie());
        const options: RequestInit = {
            method: method,
            headers: headers,
            body: data,
            redirect: 'follow'
        };

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Save cookies if present
        const cookie = response.headers.get('set-cookie');
        if (cookie) {
            this.saveCookie(cookie);
        }

        return await response.text();
    }

    private getCookie(): string {
        return fs.existsSync(this.cookieFile) ? fs.readFileSync(this.cookieFile, 'utf-8') : "";
    }

    private filterData(filter: string | null, fromDate: string, toDate: string, limit: number): FormData {
        const formdata = new FormData();
        formdata.append("datexbegin", fromDate);
        formdata.append("datexend", toDate);
        formdata.append("limitasidata", limit.toString());
        formdata.append("searchtxt", filter?.toString() || "");
        formdata.append("Filter", "Filter");
        return formdata;
    }

    public async login(): Promise<void> {
        const initialResponseText = await this.request('GET', this.baseUrl + "/m/login.php");

        const secretToken = this.extractSecretToken(initialResponseText);

        if (!secretToken) {
            throw new Error("Unable to login, please check your email and password");
        }

        const formdata = new FormData();
        formdata.append("secret_token", secretToken);
        formdata.append("username", this.user);
        formdata.append("password", this.pass);
        formdata.append("submitBtn", "");

        const loginResponseText = await this.request('POST', this.baseUrl + "/m/login.php?pgv=go", formdata);

        if (!loginResponseText.includes("/historytrx.php")) {
            throw new Error("Unable to login, please check your email and password");
        }
    }

    private saveCookie(cookie: string | null): void {
        if (cookie) {
            fs.writeFileSync(this.cookieFile, cookie, 'utf-8');
        }
    }

    private extractSecretToken(responseText: string): string | null {
        const $ = cheerio.load(responseText);
        return $('input[name="secret_token"]').val()?.toString() || null;
    }
}

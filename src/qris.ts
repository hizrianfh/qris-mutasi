import * as cheerio from "cheerio";

export class Qris {
  private user: string;
  private pass: string;
  private cookie: string;
  constructor(user: string, pass: string) {
    this.user = user;
    this.pass = pass;
    this.cookie = "";
  }

  async mutasi(
    nominal = "",
    from_date: string | null = null,
    to_date: string | null = null
  ) {
    const currentDate = new Date();
    const newDate = new Date(currentDate.getTime() + 7 * 60 * 60 * 1000);
    const today = newDate.toISOString().split("T")[0];

    from_date = from_date ?? today;
    to_date = to_date ?? today;

    if (
      !/^\d{4,}-\d{2,}-\d{2,}$/.test(from_date) ||
      !/^\d{4,}-\d{2,}-\d{2,}$/.test(to_date)
    )
      throw new Error(
        `Harap input tanggal dengan format yang benar.\neg: ${today}`
      );

    let tries = 0;
    while (true) {
      const response = await this.request(
        "https://merchant.qris.id/m/kontenr.php?idir=pages/historytrx.php",
        this.filter_data(from_date, to_date, nominal)
      );
      if (!response) throw new Error();
      const result = await response.text();
      if (!/logout/.test(result)) {
        tries += 1;
        if (tries > 3) throw new Error("Gagal login setelah 3x percobaan");
        await this.login();
      } else {
        const $ = cheerio.load(result);
        const history: any[] = [];
        $("#history > tbody > tr").each((i, tr) => {
          const row: string[] = [];
          $(tr)
            .find("td")
            .each((j, td) => {
              row.push($(td).text());
            });
          history.push(row);
        });

        const data = history
          .map((h) => {
            if (h.length < 9) return;
            return {
              id: parseInt(h[0]),
              timestamp: new Date(h[1]).getTime(),
              tanggal: h[1],
              nominal: h[2].replace(/\./g, ""),
              status: h[3].trim(),
              inv_id: parseInt(h[4]),
              tanggal_settlement: h[5],
              asal_transaksi: h[6],
              nama_costumer: h[7],
              rrn: h[8],
            };
          })
          .filter((item) => item !== undefined);

        return data;
      }
    }
  }

  private async request(url: string, data: FormData) {
    const options = {
      timeout: 8000,
    };

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), options.timeout);

    const myHeaders = new Headers();
    myHeaders.append(
      "User-Agent",
      " Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36"
    );
    myHeaders.append(
      "sec-ch-ua",
      ' "Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"'
    );
    myHeaders.append("sec-ch-ua-mobile", " ?0");
    myHeaders.append("sec-ch-ua-platform", ' "Windows"');
    myHeaders.append("Cookie", `PHPSESSID=${this.cookie}`);

    const requestOptions: RequestInit = {
      method: "POST",
      headers: myHeaders,
      body: data,
      redirect: "follow",
      ...options,
      signal: controller.signal,
    };

    try {
      const response = await fetch(url, requestOptions);

      clearTimeout(id);

      return response;
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error('Server Qris berkendala, coba lagi nanti.')
      }
    }
  }

  private async login() {
    const response = await this.request(
      "https://merchant.qris.id/m/login.php?pgv=go",
      this.login_data()
    );

    if (!response) throw new Error();

    const result = await response.text();

    if (!/historytrx/.test(result)) {
      this.cookie = "";
      throw new Error(
        "Tidak dapat login, Harap cek kembali email & password anda"
      );
    }

    const cookieHeader = response.headers.get("set-cookie");

    if (!cookieHeader)
      throw new Error(
        "Tidak dapat login, Harap cek kembali email & password anda"
      );

    const cookie = getSessionId(cookieHeader);

    if (!cookie)
      throw new Error(
        "Tidak dapat login, Harap cek kembali email & password anda"
      );

    this.cookie = cookie;

    return true;
  }

  private login_data() {
    const data = new FormData();
    data.append("username", this.user);
    data.append("password", this.pass);
    data.append("submitBtn", "");
    return data;
  }

  private filter_data(from_date: string, to_date: string, nominal = "") {
    const data = new FormData();
    data.append("datexbegin", from_date);
    data.append("datexend", to_date);
    data.append("limitasidata", "300");
    data.append("searchtxt", nominal);
    data.append("Filter", "Filter");
    return data;
  }
}

function getSessionId(cookieString: string) {
  const cookieArray = cookieString.split("; ");
  let phpSessionId: string;

  for (let i = 0; i < cookieArray.length; i++) {
    const cookie = cookieArray[i].split("=");
    if (cookie[0] === "PHPSESSID") {
      phpSessionId = cookie[1];
      return phpSessionId;
    }
  }
  return null;
}

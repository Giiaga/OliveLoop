import { HostServices, Logger, Loop, serveLoop } from "@oliveai/ldk";

let isEmail = require("email-addresses");

const logger = new Logger("companyLogoLoop");

declare type StreamListener<T> = (error: string | null, input?: T) => void;

interface StoppableStream<T> {
  stop(): void;
  setListener(callback: StreamListener<T>): void;
}

class ClipboardLoop implements Loop {
  private _host: HostServices | undefined;
  private clipboardStream: StoppableStream<string> | undefined;

  start(host: HostServices): void {
    this._host = host;
    logger.info("Requesting Stream");
    try {
      this.host.clipboard.streamClipboard((error, response) => {
        logger.debug(
          "Received clipboard text:",
          "company",
          JSON.stringify(response)
        );

        let domains: any[] = [];

        if (response) {
          let responseStringArray = response.split(" ");
          responseStringArray.forEach((string) => {
            let emailObj = isEmail(string);

            if (emailObj) {
              domains.push(emailObj.addresses[0].domain);
            }
          });
        } else return;

        this.workFile(domains).catch((e) => {
          logger.error("Received Error", "error", e);
        });
        domains = [];
      });
    } catch (e) {
      logger.error("Error Streaming", "error", e.toString());
    }
  }

  async workFile(domains: any[]): Promise<void> {
    logger.debug("Opening File");
    domains.forEach(async (domain) => {
      this.host.whisper.markdownWhisper({
        label: domain[0].toUpperCase() + domain.slice(1, domain.length - 5),
        markdown: JSON.stringify(
          `[${domain.slice(0, domain.length - 5)}]` + // Markdown image format [Name](url)
            "(logo.clearbit.com/" +
            domain +
            ")"
        ),
      });

      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
      logger.debug("File Closed");
    });
  }

  stop(): void {
    logger.info("Stopping");
    this.clipboardStream?.stop();
    this.clipboardStream = undefined;
    this._host = undefined;
    process.exit(0);
  }

  private get host(): HostServices {
    if (this._host == null) {
      throw new Error("Cannot Retrieve Host Before Set");
    }
    return this._host;
  }
}

const loop = new ClipboardLoop();
console.log(loop);
serveLoop(loop);

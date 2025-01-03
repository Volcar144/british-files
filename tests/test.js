const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
    const browser = await puppeteer.launch({
        headless: true, // Ensure this is set to 'true' for non-interactive mode
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Add the no-sandbox flag
    });
    const page = await browser.newPage();

    const localFilePath = `file://${__dirname}/../index.html`;
    await page.goto(localFilePath);

    /** Step 1: Test encoding and decoding for .british files */
    console.log("Testing .british encoding and decoding...");

    const plaintextPath = `${__dirname}/test-files/plaintext.txt`;
    const originalText = fs.readFileSync(plaintextPath, "utf8").trim();

    // Wait for the file input to be available
    await page.waitForSelector('#fileUpload'); // Ensure the file input element is on the page
    const fileInput = await page.$('#fileUpload'); // Get file input element

    if (!fileInput) {
        console.error("File input element not found!");
        process.exit(1);
    }

    // Upload plaintext file to encode it as .british
    await fileInput.uploadFile(plaintextPath); // Upload the file
    await page.click("#encodeButton");

    // Wait for the encoded .british file to be generated
    const britishFileDownload = await page.evaluate(() => {
        return new Promise((resolve) => {
            const link = document.querySelector("#downloadLink");
            link.addEventListener("click", () => resolve(link.href));
            link.click();
        });
    });

    // Download and save the .british file locally
    const britishFilePath = `${__dirname}/test-files/generated.british`;
    const encodedData = await page.evaluate(async (url) => {
        const response = await fetch(url);
        return await response.text();
    }, britishFileDownload);
    fs.writeFileSync(britishFilePath, encodedData);

    // Decode the .british file and verify the output
    const britishFileInput = await page.$('#fileUpload');
    await britishFileInput.uploadFile(britishFilePath); // Upload the generated .british file
    await page.click("#decodeButton");

    await page.waitForSelector("#output");
    const decodedText = await page.$eval("#output", el => el.textContent.trim());

    if (decodedText !== originalText) {
        console.error("Test failed: Decoded text does not match original plaintext.");
        process.exit(1);
    }
    console.log(".british encoding and decoding passed");

    /** Step 2: Test encoding and decoding for .britishm files */
    console.log("Testing .britishm encoding and decoding...");

    const mediaPath = `${__dirname}/test-files/media.png`;
    const expectedMediaType = "image/png"; // Expected MIME type for the test media

    // Upload media file to encode it as .britishm
    await page.waitForSelector('#fileUpload'); // Ensure the file input is ready
    const mediaInput = await page.$('#fileUpload');
    await mediaInput.uploadFile(mediaPath); // Upload the media file
    await page.click("#encodeButton");

    // Wait for the encoded .britishm file to be generated
    const britishmFileDownload = await page.evaluate(() => {
        return new Promise((resolve) => {
            const link = document.querySelector("#downloadLink");
            link.addEventListener("click", () => resolve(link.href));
            link.click();
        });
    });

    // Download and save the .britishm file locally
    const britishmFilePath = `${__dirname}/test-files/generated.britishm`;
    const encodedMediaData = await page.evaluate(async (url) => {
        const response = await fetch(url);
        return await response.arrayBuffer();
    }, britishmFileDownload);
    fs.writeFileSync(britishmFilePath, Buffer.from(encodedMediaData));

    // Decode the .britishm file and verify the media type
    const mediaInput2 = await page.$('#fileUpload');
    await mediaInput2.uploadFile(britishmFilePath); // Upload the generated .britishm file
    await page.click("#decodeButton");

    const mediaElement = await page.waitForSelector("#mediaOutput img, #mediaOutput video, #mediaOutput audio");
    const mediaSrc = await mediaElement.evaluate(el => el.src);

    const mediaResponse = await page.evaluate(async (src) => {
        const response = await fetch(src);
        return response.headers.get("content-type");
    }, mediaSrc);

    if (mediaResponse !== expectedMediaType) {
        console.error(`Test failed: Decoded media type mismatch. Expected '${expectedMediaType}' but got '${mediaResponse}'`);
        process.exit(1);
    }
    console.log(".britishm encoding and decoding passed");

    await browser.close();
    process.exit(0);
})();


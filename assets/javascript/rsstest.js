function fetchQuote() {
    return new Promise(function (resolve, reject) {
        // Create a hidden iframe to safely load the script
        var iframe = document.createElement("iframe");
        iframe.style.display = "none";
        document.body.appendChild(iframe);

        // Get iframe document
        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

        // Override document.writeln to capture the written content
        var capturedText = "";
        iframeDoc.writeln = function (content) {
            if (!content.includes("<b>Today's Quote</b>") && !content.includes("<a")) {
                capturedText += content.replace(/<br>/g, "").trim();
            }
        };

        // Create and load the script inside the iframe
        var script = iframeDoc.createElement("script");
        script.src = "https://www.brainyquote.com/link/quotebr.js";

        // Append the script and resolve when loaded
        script.onload = function () {
            resolve(capturedText);
            document.body.removeChild(iframe); // Clean up
        };

        script.onerror = function () {
            reject("Failed to load the quote script.");
        };

        iframeDoc.body.appendChild(script);
    });
}

// Usage example
fetchQuote().then(function (quote) {
    console.log("Quote:", quote);
}).catch(function (error) {
    console.error(error);
});
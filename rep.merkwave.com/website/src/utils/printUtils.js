// src/utils/printUtils.js
// Robust HTML printing utility: by default uses a hidden iframe (no new tab). Optional popup mode if needed.

/**
 * Print an HTML string without opening a new browser tab.
 * Defaults to using a hidden iframe so only the system print dialog appears.
 *
 * @param {string} htmlString - Full HTML document string to print
 * @param {object} options
 * @param {string} [options.title='Print'] - Document title (used in popup mode only)
 * @param {number} [options.closeAfter=600] - Cleanup delay in ms
 * @param {'iframe'|'popup'} [options.mode='iframe'] - Print method; iframe avoids opening a new tab
 * @returns {Promise<boolean>} - true if invoked, false on error
 */
export async function printHtml(
  htmlString,
  { title = 'Print', closeAfter = 600, mode = 'iframe' } = {}
) {
  try {
    if (mode === 'popup') {
      // Optional: popup mode (not default). Might open a new tab/window depending on browser settings.
      const win = window.open('', '_blank', 'noopener,noreferrer');
      if (win && win.document) {
        try {
          win.document.open();
          win.document.write(htmlString);
          win.document.close();
          try { win.document.title = title; } catch { /* ignore */ }
          await new Promise((resolve) => {
            const done = () => resolve();
            if (win.document.readyState === 'complete') setTimeout(done, 50);
            else win.onload = done;
          });
          win.focus();
          win.print();
          if (closeAfter >= 0) setTimeout(() => { try { win.close(); } catch { /* ignore */ } }, closeAfter);
          return true;
        } catch {
          try { win.close(); } catch { /* ignore */ }
          // fall through to iframe
        }
      }
    }

    // Default: hidden iframe print (no popups/new tabs)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');

    if ('srcdoc' in iframe) {
      iframe.srcdoc = htmlString;
    }
    document.body.appendChild(iframe);

    await new Promise((resolve) => {
      const done = () => resolve();
      if ('srcdoc' in iframe) {
        iframe.onload = () => setTimeout(done, 50);
      } else {
        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(htmlString);
          doc.close();
          iframe.onload = () => setTimeout(done, 50);
        } else {
          setTimeout(done, 100);
        }
      }
    });

    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => {
  try { document.body.removeChild(iframe); } catch { /* ignore */ }
      }, closeAfter >= 0 ? closeAfter : 600);
    }
    return true;
  } catch (err) {
    console.error('printHtml error:', err);
    return false;
  }
}

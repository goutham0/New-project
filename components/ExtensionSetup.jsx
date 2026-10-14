"use client";

export default function ExtensionSetup() {
  return (
    <div className="extension-steps">
      <a className="primary-button" href="/applyfriend-extension.zip" download>
        Download Chrome extension
      </a>
      <div className="extension-checklist">
        <span>1. Download and unzip the extension file.</span>
        <span>2. Open chrome://extensions and turn on Developer mode.</span>
        <span>3. Click Load unpacked and select the unzipped extension folder.</span>
        <span>4. Click Prepare and open on any assisted job.</span>
        <span>5. On the employer form, click the extension icon and press Autofill page. Review the filled fields and upload your resume.</span>
        <span>6. After you manually submit, click Mark submitted in the extension popup to record the application.</span>
      </div>
    </div>
  );
}

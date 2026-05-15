window.ApplyPilotFieldMapping = {
  normalize(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  },

  labelFor(input) {
    const id = input.getAttribute("id");
    const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    const aria = input.getAttribute("aria-label");
    const placeholder = input.getAttribute("placeholder");
    const nearby = input.closest("label")?.innerText || input.parentElement?.innerText || "";
    return [label?.innerText, aria, placeholder, nearby, input.name].filter(Boolean).join(" ");
  },

  valueFor(label, profile, application) {
    const text = this.normalize(label);
    const coverLetter = application?.package?.coverLetter;
    const answers = application?.package?.answers || [];

    if (text.includes("first name")) return profile.firstName;
    if (text.includes("last name")) return profile.lastName;
    if (text.includes("full name") || text === "name") return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    if (text.includes("email")) return profile.email;
    if (text.includes("phone")) return profile.phone;
    if (text.includes("linkedin")) return profile.linkedinUrl;
    if (text.includes("github")) return profile.githubUrl;
    if (text.includes("portfolio")) return profile.portfolioUrl;
    if (text.includes("address")) return profile.address;
    if (text.includes("city")) return profile.city;
    if (text.includes("state")) return profile.state;
    if (text.includes("zip") || text.includes("postal")) return profile.zipCode;
    if (text.includes("country")) return profile.country;
    if (text.includes("current company")) return profile.currentCompany;
    if (text.includes("current title") || text.includes("job title")) return profile.currentTitle;
    if (text.includes("salary")) return [profile.expectedSalaryMin, profile.expectedSalaryMax].filter(Boolean).join(" - ");
    if (text.includes("notice")) return profile.noticePeriod;
    if (text.includes("sponsor")) return profile.sponsorshipRequired;
    if (text.includes("authorized") || text.includes("authorization")) return profile.workAuthorization;
    if (text.includes("cover letter")) return coverLetter;

    const matchingAnswer = answers.find((answer) => {
      const question = this.normalize(answer.question);
      return question && (text.includes(question.slice(0, 24)) || question.includes(text.slice(0, 24)));
    });
    return matchingAnswer?.answer || "";
  }
};

window.ApplyFriendFieldMapping = {
  normalize(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  },

  labelFor(input) {
    const id = input.getAttribute("id");
    const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    const labelledBy = input.getAttribute("aria-labelledby")
      ?.split(/\s+/)
      .map((item) => document.getElementById(item)?.innerText)
      .filter(Boolean)
      .join(" ");
    const aria = input.getAttribute("aria-label");
    const placeholder = input.getAttribute("placeholder");
    const fieldset = input.closest("fieldset")?.innerText || "";
    const nearby = input.closest("label")?.innerText || input.parentElement?.innerText || "";
    return [fieldset, label?.innerText, labelledBy, aria, placeholder, nearby, input.name, input.id].filter(Boolean).join(" ");
  },

  optionTextFor(input) {
    const id = input.getAttribute("id");
    const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    return [label?.innerText, input.getAttribute("aria-label"), input.value].filter(Boolean).join(" ");
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
    if (text.includes("years") && text.includes("experience")) return profile.yearsExperience;
    if (text.includes("highest education") || text.includes("education level")) return profile.highestEducation;
    if (text.includes("university") || text.includes("school") || text.includes("college")) return profile.university;
    if (text.includes("degree")) return profile.degree || profile.highestEducation;
    if (text.includes("graduation")) return profile.graduationYear;
    if (text.includes("preferred location")) return profile.preferredLocations;
    if (text.includes("remote") || text.includes("hybrid") || text.includes("onsite")) return profile.remotePreference;
    if (text.includes("salary")) return [profile.expectedSalaryMin, profile.expectedSalaryMax].filter(Boolean).join(" - ");
    if (text.includes("notice")) return profile.noticePeriod;
    if (text.includes("sponsor")) return profile.sponsorshipRequired;
    if (text.includes("authorized") || text.includes("authorization")) return profile.workAuthorization;
    if (text.includes("cover letter") || text.includes("additional information") || text.includes("anything else")) return coverLetter;

    const matchingAnswer = answers.find((answer) => {
      const question = this.normalize(answer.question);
      return question && this.questionMatches(text, question);
    });
    if (matchingAnswer?.answer) return matchingAnswer.answer;
    if ((text.includes("why") && (text.includes("role") || text.includes("company") || text.includes("interested"))) || text.includes("why are you a fit")) {
      return answers[0]?.answer || coverLetter;
    }
    if (text.includes("tell us about yourself") || text.includes("summary")) {
      return application?.package?.tailoredResume?.summary || answers[0]?.answer || "";
    }
    return "";
  },

  choiceValueFor(label, profile, application) {
    const text = this.normalize(label);
    if (text.includes("sponsor")) return this.yesNo(profile.sponsorshipRequired);
    if (text.includes("authorized") || text.includes("authorization") || text.includes("work in")) {
      return this.isAuthorized(profile.workAuthorization) ? "yes" : this.yesNo(profile.workAuthorization);
    }
    if (text.includes("remote") || text.includes("hybrid") || text.includes("onsite")) return profile.remotePreference;
    if (text.includes("relocate")) return this.yesNo(profile.willingToRelocate);
    return this.valueFor(label, profile, application);
  },

  choiceMatches(optionText, desiredValue) {
    const option = this.normalize(optionText);
    const desired = this.normalize(desiredValue);
    if (!option || !desired) return false;
    if (option === desired || option.includes(desired) || desired.includes(option)) return true;
    const desiredYesNo = this.yesNo(desired);
    const optionYesNo = this.yesNo(option);
    return Boolean(desiredYesNo && optionYesNo && desiredYesNo === optionYesNo);
  },

  isSafeCheckbox(label) {
    const text = this.normalize(label);
    if (text.includes("terms") || text.includes("privacy") || text.includes("consent") || text.includes("certify") || text.includes("confirm")) {
      return false;
    }
    return text.includes("sponsor") || text.includes("authorized") || text.includes("authorization") || text.includes("remote") || text.includes("relocate");
  },

  questionMatches(labelText, questionText) {
    if (!labelText || !questionText) return false;
    if (labelText.includes(questionText) || questionText.includes(labelText)) return true;
    const labelWords = new Set(labelText.split(" ").filter((word) => word.length > 3));
    const questionWords = questionText.split(" ").filter((word) => word.length > 3);
    if (!labelWords.size || !questionWords.length) return false;
    const overlap = questionWords.filter((word) => labelWords.has(word)).length;
    return overlap >= Math.min(3, questionWords.length);
  },

  yesNo(value) {
    const text = this.normalize(value);
    if (!text) return "";
    if (/\b(no|false|n)\b/.test(text) || text.includes("not require") || text.includes("does not require")) return "no";
    if (/\b(yes|true|y)\b/.test(text) || text.includes("authorized") || text.includes("citizen") || text.includes("permanent resident")) return "yes";
    return "";
  },

  isAuthorized(value) {
    const text = this.normalize(value);
    return text.includes("authorized") || text.includes("citizen") || text.includes("permanent resident") || text === "yes";
  }
};

// Inhalte der App. Englische Varianten mit "|" trennen: die erste wird angezeigt, alle zählen als richtig.

const PHASES = [
  {
    weeks: [1, 4],
    name: "Fundament",
    goal: "2 Minuten ohne Stocken über dich und deinen Job sprechen.",
    topics: [
      "introducing yourself and your professional background",
      "small talk with a new colleague at the coffee machine",
      "talking about your previous job and what you learned there",
      "describing a typical working day",
      "your hobbies and what you did last weekend",
      "why you want to work in the healthcare and digital sector",
      "a project you are proud of",
    ],
  },
  {
    weeks: [5, 8],
    name: "Job-Situationen",
    goal: "10 Minuten Meeting-Simulation ohne Wechsel ins Deutsche.",
    topics: [
      "a team meeting about a new campaign for doctors",
      "giving your opinion and politely disagreeing in a meeting",
      "a video call with an international partner",
      "explaining a problem and suggesting a solution",
      "a phone call to arrange a meeting with a client",
      "giving a status update on your tasks",
      "asking for clarification when you didn't understand something",
    ],
  },
  {
    weeks: [9, 12],
    name: "Unter Druck",
    goal: "Frei präsentieren und diskutieren. Am Ende: Aufnahme mit Woche 1 vergleichen.",
    topics: [
      "a 3-minute presentation of a product without preparation",
      "a discussion where you (the coach) disagree with everything I say",
      "a job interview in English",
      "negotiating a deadline with my manager",
      "presenting results and numbers",
      "handling difficult questions after a presentation",
      "summarizing a long meeting for a colleague who missed it",
    ],
  },
];

const MILESTONES = {
  4: "Meilenstein: Schaffst du 2 Minuten Selbstvorstellung ohne Pause?",
  8: "Meilenstein: Schaffst du 10 Minuten Meeting-Simulation ohne Deutsch?",
  12: "Meilenstein: Hör dir deine Aufnahme aus Woche 1 an und vergleiche.",
};

const RECORDING_PROMPT = "Introduce yourself: who you are, what you do and what you want to achieve in your new job. (ca. 1 Minute)";

const SENTENCES = {
  "Vorstellung & Smalltalk": [
    ["Hi, nice to meet you. I've just joined the team.", "Hallo, schön dich kennenzulernen. Ich bin gerade neu im Team."],
    ["I've been working in this field for about five years.", "Ich arbeite seit ungefähr fünf Jahren in diesem Bereich."],
    ["Before that, I worked for a smaller company in Cologne.", "Davor habe ich für eine kleinere Firma in Köln gearbeitet."],
    ["What are you working on at the moment?|What are you working on right now?", "Woran arbeitest du gerade?"],
    ["How long have you been with the company?|How long have you been working for the company?", "Wie lange bist du schon bei der Firma?"],
    ["Did you have a good weekend?|Did you have a nice weekend?", "Hattest du ein schönes Wochenende?"],
    ["I'm still getting used to everything, but I really like it so far.", "Ich gewöhne mich noch an alles, aber bisher gefällt es mir sehr."],
    ["Sorry, I didn't catch your name.", "Entschuldigung, ich habe deinen Namen nicht verstanden."],
    ["Let me know if you need any help with that.", "Sag Bescheid, wenn du dabei Hilfe brauchst."],
    ["I'm really looking forward to working with you.", "Ich freue mich sehr auf die Zusammenarbeit mit dir."],
    ["Where are you from originally?", "Woher kommst du ursprünglich?"],
    ["How was your trip?", "Wie war deine Reise?"],
  ],
  "Meetings": [
    ["Could we go through the agenda first?", "Können wir zuerst die Tagesordnung durchgehen?"],
    ["From my point of view, this is the most important issue.|In my view, this is the most important issue.", "Aus meiner Sicht ist das der wichtigste Punkt."],
    ["I see your point, but I'm not sure that will work.", "Ich verstehe deinen Punkt, aber ich bin nicht sicher, ob das funktioniert."],
    ["Could you explain what you mean by that?", "Kannst du erklären, was du damit meinst?"],
    ["Just to make sure I understand, you want us to finish by Friday?", "Nur damit ich es richtig verstehe: Wir sollen bis Freitag fertig sein?"],
    ["I'd like to add something to that.|I would like to add something to that.", "Ich würde dazu gern etwas ergänzen."],
    ["Let's come back to this later.", "Lass uns später darauf zurückkommen."],
    ["So, to sum up, we agreed on three things.", "Also, zusammengefasst haben wir uns auf drei Dinge geeinigt."],
    ["Who is going to take care of this?|Who will take care of this?", "Wer kümmert sich darum?"],
    ["I'll send you a short summary after the meeting.", "Ich schicke euch nach dem Meeting eine kurze Zusammenfassung."],
    ["Sorry to interrupt, but I have a quick question.", "Entschuldigung für die Unterbrechung, aber ich habe eine kurze Frage."],
    ["We're running out of time, so let's focus on the main points.", "Uns läuft die Zeit davon, also konzentrieren wir uns auf die Hauptpunkte."],
  ],
  "Calls & Video-Calls": [
    ["Can you hear me okay?|Can you hear me?", "Kannst du mich gut hören?"],
    ["Sorry, you're breaking up a bit.", "Entschuldigung, deine Verbindung bricht etwas ab."],
    ["Could you repeat that, please?|Could you say that again, please?", "Kannst du das bitte wiederholen?"],
    ["Let me share my screen.", "Ich teile mal meinen Bildschirm."],
    ["I'm calling about the email you sent yesterday.", "Ich rufe wegen der E-Mail an, die du gestern geschickt hast."],
    ["Would Tuesday at ten work for you?|Does Tuesday at ten work for you?", "Würde dir Dienstag um zehn passen?"],
    ["I'm afraid I can't make it on Thursday.", "Leider schaffe ich es am Donnerstag nicht."],
    ["I'll get back to you by the end of the day.", "Ich melde mich bis Ende des Tages bei dir."],
    ["Thanks for your time, talk to you soon.", "Danke für deine Zeit, bis bald."],
    ["Sorry, I was on mute.", "Entschuldigung, ich war stummgeschaltet."],
    ["Can everyone see my screen?", "Können alle meinen Bildschirm sehen?"],
    ["I think we lost you for a moment.", "Ich glaube, wir haben dich kurz verloren."],
  ],
  "Präsentation & Zahlen": [
    ["Today I'd like to give you a quick overview of our results.", "Heute möchte ich euch einen kurzen Überblick über unsere Ergebnisse geben."],
    ["As you can see on this slide, the numbers have gone up.", "Wie ihr auf dieser Folie seht, sind die Zahlen gestiegen."],
    ["Compared to last year, we reached twice as many users.", "Im Vergleich zum letzten Jahr haben wir doppelt so viele Nutzer erreicht."],
    ["This is mainly due to our new newsletter.", "Das liegt hauptsächlich an unserem neuen Newsletter."],
    ["Let me give you an example.", "Ich gebe euch ein Beispiel."],
    ["That's a good question. Let me think about it for a second.", "Gute Frage. Lass mich kurz darüber nachdenken."],
    ["I don't have the exact figures with me, but I can send them to you.", "Ich habe die genauen Zahlen nicht dabei, aber ich kann sie dir schicken."],
    ["Our next step is to test the campaign with a smaller group.", "Unser nächster Schritt ist, die Kampagne mit einer kleineren Gruppe zu testen."],
    ["Are there any questions so far?", "Gibt es bis hierhin Fragen?"],
    ["To wrap up, I think we're on the right track.", "Zum Abschluss: Ich glaube, wir sind auf dem richtigen Weg."],
    ["The number of sign-ups has dropped slightly.", "Die Zahl der Anmeldungen ist leicht gesunken."],
    ["Let's move on to the next point.", "Kommen wir zum nächsten Punkt."],
  ],
  "Gesundheitswesen & Digital": [
    ["Our users are doctors, pharmacists and other healthcare professionals.", "Unsere Nutzer sind Ärzte, Apotheker und andere Fachkräfte im Gesundheitswesen."],
    ["Healthcare professionals need reliable information quickly.", "Fachkräfte im Gesundheitswesen brauchen schnell verlässliche Informationen."],
    ["Pharmaceutical companies want to reach doctors in a compliant way.", "Pharmaunternehmen wollen Ärzte auf regelkonforme Weise erreichen."],
    ["Data protection is extremely important in the medical sector.", "Datenschutz ist im medizinischen Bereich extrem wichtig."],
    ["We need to make sure that the content is medically correct.", "Wir müssen sicherstellen, dass der Inhalt medizinisch korrekt ist."],
    ["The target group for this campaign is general practitioners.", "Die Zielgruppe dieser Kampagne sind Allgemeinmediziner."],
    ["We want to find out how doctors use our content on their phones.", "Wir wollen herausfinden, wie Ärzte unsere Inhalte auf dem Handy nutzen."],
    ["We should check the engagement rate before we decide.", "Wir sollten die Interaktionsrate prüfen, bevor wir entscheiden."],
    ["Could you send me the brief for the new campaign?", "Kannst du mir das Briefing für die neue Kampagne schicken?"],
    ["The login has to be simple, but it also has to be secure.", "Der Login muss einfach sein, aber auch sicher."],
    ["We need approval from the legal department first.", "Wir brauchen zuerst die Freigabe der Rechtsabteilung."],
    ["The open rate of our last newsletter was quite high.", "Die Öffnungsrate unseres letzten Newsletters war ziemlich hoch."],
  ],
};

// Grammatik: eine Einheit pro Woche. items: [Deutsch, Englisch (Varianten mit |), Hinweis]
const GRAMMAR = [
  {
    title: "Present Perfect oder Past Simple",
    rule: "Past Simple für Abgeschlossenes mit Zeitpunkt (yesterday, last week, in 2020). Present Perfect für Erfahrungen und Ergebnisse ohne Zeitpunkt (already, yet, ever, so far).",
    examples: [["I spoke to him yesterday.", "Zeitpunkt → Past Simple"], ["I have already finished the report.", "kein Zeitpunkt → Present Perfect"]],
    items: [
      ["Ich habe gestern mit dem Kunden gesprochen.", "I spoke to the client yesterday.|I talked to the client yesterday.", "gestern = Zeitpunkt"],
      ["Ich habe den Bericht schon fertig gemacht.", "I have already finished the report.|I've already finished the report.", "already"],
      ["Hast du die E-Mail schon gelesen?", "Have you read the email yet?|Have you already read the email?", "yet in Fragen"],
      ["Wir haben das Projekt letzten Monat gestartet.", "We started the project last month.", "last month"],
      ["Ich war noch nie in London.", "I have never been to London.|I've never been to London.", "Erfahrung"],
      ["Bis jetzt haben wir 200 Anmeldungen bekommen.", "So far we have received 200 registrations.|So far we have had 200 sign-ups.", "so far"],
      ["Als ich bei meiner alten Firma war, habe ich viel gelernt.", "When I was at my old company, I learned a lot.|When I was at my old company, I learnt a lot.", "abgeschlossene Zeit"],
      ["Sie hat gerade angerufen.", "She has just called.|She just called.", "just"],
    ],
  },
  {
    title: "since, for und ago",
    rule: "for + Zeitraum (for two years), since + Zeitpunkt (since 2020). „Seit … bis jetzt“ heißt im Englischen have been + -ing oder have + 3. Form. ago = vor (two years ago) steht mit Past Simple.",
    examples: [["I have been working here for two years.", "Zeitraum → for"], ["I started two years ago.", "vor → ago + Past Simple"]],
    items: [
      ["Ich arbeite seit drei Jahren im Marketing.", "I have been working in marketing for three years.|I've been working in marketing for three years.", "Zeitraum"],
      ["Ich wohne seit 2019 in Köln.", "I have lived in Cologne since 2019.|I have been living in Cologne since 2019.|I've lived in Cologne since 2019.", "Zeitpunkt"],
      ["Ich habe vor zwei Jahren angefangen.", "I started two years ago.", "vor = ago"],
      ["Wir warten seit einer Stunde auf die Antwort.", "We have been waiting for the answer for an hour.|We've been waiting for the answer for an hour.", "Zeitraum"],
      ["Wie lange arbeitest du schon hier?", "How long have you been working here?|How long have you worked here?", "Dauer bis jetzt"],
      ["Ich kenne sie seit der Uni.", "I have known her since university.|I've known her since university.", "know: keine -ing-Form"],
      ["Das Meeting hat vor zehn Minuten angefangen.", "The meeting started ten minutes ago.", "ago"],
      ["Seit Montag haben wir ein neues Tool.", "We have had a new tool since Monday.|We've had a new tool since Monday.", "Zeitpunkt"],
    ],
  },
  {
    title: "Höflich fragen und bitten",
    rule: "Direkte Aufforderungen wirken im Englischen schnell unhöflich. Besser: Could you …?, Would you mind + -ing?, I'd like …, Would it be possible to …?",
    examples: [["Could you send me the file?", "statt: Send me the file."], ["Would you mind checking that?", "mind + -ing"]],
    items: [
      ["Kannst du mir die Datei schicken?", "Could you send me the file?|Could you send me the file, please?", "could"],
      ["Würde es dir etwas ausmachen, das zu prüfen?", "Would you mind checking that?|Would you mind checking it?", "mind + -ing"],
      ["Ich hätte gern mehr Informationen.", "I'd like some more information.|I would like some more information.|I would like more information.", "information ohne s"],
      ["Wäre es möglich, das Meeting zu verschieben?", "Would it be possible to move the meeting?|Would it be possible to postpone the meeting?", "would it be possible"],
      ["Darf ich dir kurz eine Frage stellen?", "Could I ask you a quick question?|Can I ask you a quick question?", "could I"],
      ["Könntest du das bitte langsamer erklären?", "Could you explain that more slowly, please?|Could you please explain that more slowly?", "more slowly"],
      ["Ich würde vorschlagen, dass wir morgen weitermachen.", "I'd suggest that we continue tomorrow.|I would suggest that we continue tomorrow.|I'd suggest continuing tomorrow.", "suggest"],
      ["Hättest du heute Nachmittag ein paar Minuten Zeit?", "Would you have a few minutes this afternoon?|Do you have a few minutes this afternoon?", "would you have"],
    ],
  },
  {
    title: "Satzstellung und indirekte Fragen",
    rule: "Im Englischen gilt fast immer: Subjekt, Verb, Objekt. Bei indirekten Fragen wird nicht umgestellt: Do you know where the room is? (nicht: where is the room).",
    examples: [["Do you know where the meeting room is?", "keine Umstellung"], ["Yesterday I spoke to the team.", "Subjekt vor Verb"]],
    items: [
      ["Weißt du, wo der Besprechungsraum ist?", "Do you know where the meeting room is?", "keine Umstellung"],
      ["Kannst du mir sagen, wann das Meeting anfängt?", "Can you tell me when the meeting starts?|Could you tell me when the meeting starts?", "keine Umstellung"],
      ["Ich weiß nicht, was er meint.", "I don't know what he means.", "what he means"],
      ["Gestern habe ich mit dem Team gesprochen.", "Yesterday I spoke to the team.|I spoke to the team yesterday.|Yesterday I talked to the team.", "Subjekt vor Verb"],
      ["Was hat der Kunde gesagt?", "What did the client say?|What did the customer say?", "did + Grundform"],
      ["Warum hast du das nicht erwähnt?", "Why didn't you mention that?|Why didn't you mention it?", "didn't + Grundform"],
      ["Ich frage mich, ob das funktioniert.", "I wonder if that will work.|I wonder whether that will work.|I wonder if that works.", "if / whether"],
      ["Morgen schicke ich dir die Zahlen.", "I'll send you the numbers tomorrow.|Tomorrow I'll send you the numbers.|I will send you the numbers tomorrow.", "Zukunft mit will"],
    ],
  },
  {
    title: "Meinung sagen und widersprechen",
    rule: "Kritik wird im Englischen weicher formuliert: I see your point, but …, I'm not sure that …, Wouldn't it be better to …? Ein direktes „That's wrong“ wirkt hart.",
    examples: [["I see your point, but I'm not sure.", "weich widersprechen"], ["Wouldn't it be better to wait?", "Vorschlag als Frage"]],
    items: [
      ["Meiner Meinung nach sollten wir warten.", "In my opinion, we should wait.|In my view, we should wait.", "in my opinion"],
      ["Ich sehe das etwas anders.", "I see it a bit differently.|I see it slightly differently.|I see that a bit differently.", "differently"],
      ["Da stimme ich dir völlig zu.", "I completely agree with you.|I totally agree with you.", "agree ist ein Verb"],
      ["Ich bin mir nicht sicher, ob das die beste Lösung ist.", "I'm not sure that's the best solution.|I'm not sure if that's the best solution.|I'm not sure that is the best solution.", "weich"],
      ["Wäre es nicht besser, zuerst die Daten zu prüfen?", "Wouldn't it be better to check the data first?", "wouldn't it be better"],
      ["Das ist ein guter Punkt, aber wir haben nicht genug Zeit.", "That's a good point, but we don't have enough time.", "zustimmen, dann einschränken"],
      ["Ich verstehe, was du meinst.", "I understand what you mean.|I see what you mean.", "what you mean"],
      ["Lass uns beide Optionen vergleichen.", "Let's compare both options.|Let's compare the two options.", "let's"],
    ],
  },
  {
    title: "Zukunft: will, going to, Verlaufsform",
    rule: "will für spontane Entscheidungen und Versprechen (I'll call you). going to für Pläne (We're going to launch it in May). Verlaufsform für feste Termine (I'm meeting the client on Friday).",
    examples: [["I'll call you back.", "spontan"], ["I'm meeting the client on Friday.", "fester Termin"]],
    items: [
      ["Ich rufe dich gleich zurück.", "I'll call you back in a minute.|I'll call you back in a moment.|I'll call you right back.", "spontan → will"],
      ["Wir werden die Kampagne im Mai starten.", "We're going to launch the campaign in May.|We are going to launch the campaign in May.|We're going to start the campaign in May.", "Plan → going to"],
      ["Ich treffe den Kunden am Freitag.", "I'm meeting the client on Friday.|I am meeting the client on Friday.", "Termin → -ing"],
      ["Keine Sorge, ich kümmere mich darum.", "Don't worry, I'll take care of it.|Don't worry, I'll take care of that.", "Versprechen → will"],
      ["Was machst du dieses Wochenende?", "What are you doing this weekend?", "Plan → -ing"],
      ["Ich glaube, das wird gut funktionieren.", "I think it will work well.|I think that will work well.", "Vermutung → will"],
      ["Wir werden nächste Woche die Ergebnisse präsentieren.", "We're going to present the results next week.|We are going to present the results next week.", "Plan → going to"],
      ["Ich helfe dir dabei.", "I'll help you with that.|I'll help you with it.", "Angebot → will"],
    ],
  },
  {
    title: "Bedingungen mit if",
    rule: "Realistisch: If + Gegenwart, dann will (If we start now, we'll finish on time). Hypothetisch: If + Vergangenheit, dann would (If I had more time, I would …). Direkt nach if steht nie will oder would.",
    examples: [["If we start now, we'll finish on time.", "realistisch"], ["If I had more time, I would take a course.", "hypothetisch"]],
    items: [
      ["Wenn wir jetzt anfangen, sind wir rechtzeitig fertig.", "If we start now, we'll finish on time.|If we start now, we will finish on time.", "realistisch"],
      ["Wenn ich mehr Zeit hätte, würde ich einen Kurs machen.", "If I had more time, I would take a course.|If I had more time, I'd take a course.|If I had more time, I would do a course.", "hypothetisch"],
      ["Wenn du Fragen hast, schreib mir einfach.", "If you have any questions, just send me a message.|If you have any questions, just write to me.|If you have any questions, just message me.", "Gegenwart nach if"],
      ["Was würdest du machen, wenn du Chef wärst?", "What would you do if you were the boss?", "were"],
      ["Wenn das Budget reicht, testen wir beide Varianten.", "If the budget is enough, we'll test both versions.|If the budget is enough, we will test both versions.", "realistisch"],
      ["Ich würde es anders machen, wenn ich du wäre.", "I would do it differently if I were you.|I'd do it differently if I were you.", "if I were you"],
      ["Wenn der Kunde zustimmt, können wir morgen starten.", "If the client agrees, we can start tomorrow.|If the customer agrees, we can start tomorrow.", "Gegenwart nach if"],
      ["Sag mir Bescheid, wenn du Hilfe brauchst.", "Let me know if you need any help.|Let me know if you need help.", "let me know"],
    ],
  },
  {
    title: "Präpositionen bei Zeit und Ort",
    rule: "at + Uhrzeit (at ten), on + Tag oder Datum (on Monday), in + Monat, Jahr, Tageszeit (in May, in the morning). by = bis spätestens, in two weeks = in zwei Wochen.",
    examples: [["The meeting is on Monday at ten.", "on + Tag, at + Uhrzeit"], ["I need it by Friday.", "by = bis spätestens"]],
    items: [
      ["Das Meeting ist am Montag um zehn Uhr.", "The meeting is on Monday at ten o'clock.|The meeting is on Monday at ten.", "on / at"],
      ["Ich habe im Mai angefangen.", "I started in May.", "in + Monat"],
      ["Wir sprechen morgen früh darüber.", "We'll talk about it tomorrow morning.|We will talk about it tomorrow morning.", "kein on/in vor tomorrow"],
      ["Ich arbeite am liebsten am Vormittag.", "I prefer to work in the morning.|I prefer working in the morning.", "in the morning"],
      ["Bis Freitag brauche ich die Zahlen.", "I need the numbers by Friday.", "by = bis spätestens"],
      ["Ich bin von neun bis fünf im Büro.", "I'm in the office from nine to five.|I am in the office from nine to five.", "from … to"],
      ["Wir haben uns auf der Konferenz kennengelernt.", "We met at the conference.", "at + Veranstaltung"],
      ["In zwei Wochen haben wir die Ergebnisse.", "We'll have the results in two weeks.|We will have the results in two weeks.", "in + Zeitraum"],
    ],
  },
  {
    title: "Passiv im Business-Englisch",
    rule: "Passiv = be + 3. Form. Nützlich, wenn die Handlung wichtiger ist als die Person: The report was sent yesterday. The data is checked every week.",
    examples: [["The report was sent yesterday.", "Vergangenheit"], ["The data is checked every week.", "Gegenwart"]],
    items: [
      ["Der Bericht wurde gestern verschickt.", "The report was sent yesterday.|The report was sent out yesterday.", "was + 3. Form"],
      ["Die Daten werden jede Woche geprüft.", "The data is checked every week.|The data are checked every week.", "is + 3. Form"],
      ["Die Kampagne wurde von unserem Team entwickelt.", "The campaign was developed by our team.", "by = von"],
      ["Das Problem ist schon gelöst worden.", "The problem has already been solved.", "has been + 3. Form"],
      ["Die Ergebnisse werden morgen präsentiert.", "The results will be presented tomorrow.", "will be + 3. Form"],
      ["Alle Texte werden von Ärzten geprüft.", "All texts are checked by doctors.|All texts are reviewed by doctors.", "are + 3. Form"],
      ["Mir wurde gesagt, dass das Meeting abgesagt wurde.", "I was told that the meeting was cancelled.|I was told that the meeting had been cancelled.|I was told the meeting was cancelled.", "I was told"],
      ["Wo wird das Produkt hergestellt?", "Where is the product made?|Where is the product produced?", "is + 3. Form"],
    ],
  },
  {
    title: "-ing oder to + Verb",
    rule: "Nach enjoy, suggest, avoid, mind, look forward to, be used to folgt -ing. Nach want, decide, plan, need, agree, try folgt to + Verb.",
    examples: [["I'm looking forward to hearing from you.", "look forward to + -ing"], ["We decided to wait.", "decide + to"]],
    items: [
      ["Ich freue mich darauf, von dir zu hören.", "I'm looking forward to hearing from you.|I look forward to hearing from you.", "look forward to + -ing"],
      ["Ich schlage vor, das Meeting zu verschieben.", "I suggest postponing the meeting.|I suggest moving the meeting.", "suggest + -ing"],
      ["Wir haben beschlossen, das Budget zu erhöhen.", "We decided to increase the budget.|We have decided to increase the budget.", "decide + to"],
      ["Ich bin es gewohnt, auf Englisch zu präsentieren.", "I'm used to presenting in English.|I am used to presenting in English.", "be used to + -ing"],
      ["Ich arbeite gern im Team.", "I enjoy working in a team.|I like working in a team.", "enjoy + -ing"],
      ["Wir müssen die Zahlen noch einmal prüfen.", "We need to check the numbers again.", "need + to"],
      ["Versuch, Fachbegriffe zu vermeiden.", "Try to avoid using technical terms.|Try to avoid technical terms.", "avoid + -ing"],
      ["Sie hat zugestimmt, uns zu helfen.", "She agreed to help us.|She has agreed to help us.", "agree + to"],
    ],
  },
  {
    title: "must, have to, mustn't, don't have to",
    rule: "Falle für Deutsche: mustn't heißt „darf nicht“! „Muss nicht“ heißt don't have to oder don't need to. must und have to heißen „muss“.",
    examples: [["You don't have to come.", "musst nicht"], ["You mustn't share this.", "darfst nicht"]],
    items: [
      ["Du musst das heute nicht fertig machen.", "You don't have to finish it today.|You don't need to finish it today.|You don't have to finish this today.", "muss nicht = don't have to"],
      ["Wir dürfen keine Patientendaten teilen.", "We mustn't share patient data.|We must not share patient data.|We are not allowed to share patient data.", "darf nicht = mustn't"],
      ["Ich muss morgen früh los.", "I have to leave early tomorrow.|I have to leave early tomorrow morning.", "have to"],
      ["Du brauchst nicht zu warten.", "You don't need to wait.|You don't have to wait.", "don't need to"],
      ["Wir sollten den Kunden informieren.", "We should inform the client.|We should let the client know.", "should"],
      ["Darf ich hier parken?", "Can I park here?|Am I allowed to park here?|May I park here?", "can / allowed to"],
      ["Das muss bis Freitag erledigt sein.", "This has to be done by Friday.|It has to be done by Friday.|This must be done by Friday.", "has to be done"],
      ["Du hättest mich anrufen sollen.", "You should have called me.", "should have + 3. Form"],
    ],
  },
  {
    title: "Indirekte Rede und Zusammenfassen",
    rule: "say something, aber tell someone something. In der indirekten Rede rutscht die Zeit oft eine Stufe zurück: „I'm busy“ wird zu She said she was busy.",
    examples: [["He told me that he was sick.", "tell + Person"], ["She said that she would call later.", "will → would"]],
    items: [
      ["Er hat mir gesagt, dass er krank ist.", "He told me that he was sick.|He told me he was sick.|He told me that he was ill.", "tell + Person"],
      ["Sie sagte, dass sie später anruft.", "She said that she would call later.|She said she would call later.|She said she'd call later.", "will → would"],
      ["Der Kunde hat gefragt, ob wir den Termin verschieben können.", "The client asked if we could move the appointment.|The client asked whether we could move the appointment.|The customer asked if we could move the appointment.", "can → could"],
      ["Kurz gesagt: Wir brauchen mehr Zeit.", "In short, we need more time.|In a nutshell, we need more time.", "in short"],
      ["Er meinte, das Budget sei zu klein.", "He said the budget was too small.|He said that the budget was too small.", "is → was"],
      ["Sie hat mich gebeten, ihr die Datei zu schicken.", "She asked me to send her the file.", "ask + Person + to"],
      ["Zusammengefasst haben wir drei Probleme.", "To sum up, we have three problems.|In summary, we have three problems.", "to sum up"],
      ["Ich habe ihm gesagt, dass ich nicht kommen kann.", "I told him that I couldn't come.|I told him I couldn't come.", "can → could"],
    ],
  },
];

// Typische Fehler von Deutschen: [falsch, richtig, warum]
const STARTER_CARDS = [
  ["I work here since 2020.", "I have been working here since 2020.", "Dauer bis jetzt → Present Perfect"],
  ["I have seen him yesterday.", "I saw him yesterday.", "Fester Zeitpunkt in der Vergangenheit → Past Simple"],
  ["I have been here since three years.", "I have been here for three years.", "since + Zeitpunkt, for + Zeitraum"],
  ["I became an email from my boss.", "I got an email from my boss.", "become = werden, nicht bekommen"],
  ["Actually we have twenty employees.", "Currently we have twenty employees.", "actually = eigentlich/tatsächlich, nicht aktuell"],
  ["Eventually we can meet next week.", "Maybe we can meet next week.", "eventually = schließlich, nicht eventuell"],
  ["I make a meeting with the team.", "I have a meeting with the team.", "Feste Verbindung: have a meeting"],
  ["Yesterday went I to Cologne.", "Yesterday I went to Cologne.", "Subjekt steht vor dem Verb"],
  ["I am engineer.", "I am an engineer.", "Artikel bei Berufen"],
  ["Thanks for the informations.", "Thanks for the information.", "information ist nicht zählbar"],
  ["Can you give me an advice?", "Can you give me some advice?", "advice ist nicht zählbar"],
  ["We discussed about the budget.", "We discussed the budget.", "Kein about nach discuss"],
  ["How is it called in English?", "What is it called in English?", "Deutsches „wie“ → what"],
  ["I have to ask my chef.", "I have to ask my boss.", "chef = Koch"],
  ["I am here since Monday.", "I have been here since Monday.", "Seit … bis jetzt → Present Perfect"],
  ["He said me that it's fine.", "He told me that it's fine.", "say something, tell someone"],
  ["I am agree with you.", "I agree with you.", "agree ist ein Verb, kein Adjektiv"],
  ["I look forward to hear from you.", "I look forward to hearing from you.", "look forward to + -ing"],
  ["Can you borrow me your pen?", "Can you lend me your pen?", "borrow = sich leihen, lend = verleihen"],
  ["The meeting is at the Monday.", "The meeting is on Monday.", "on + Wochentag, ohne the"],
];

function TUTOR_PROMPT(topic, s) {
  const job = s.company
    ? `I'm starting a job at ${s.company}${s.role ? " as " + s.role : ""}.`
    : `I'm starting a new job${s.role ? " as " + s.role : ""} at a company in the healthcare / medical online sector.`;
  return `You are my English speaking coach. My level is B1–B2 and I'm a German native speaker. ${job} I want to speak fluently and grammatically correct in a professional context.

Today's topic: ${topic}

Rules:
1. Have a natural conversation with me. Ask one question at a time. Keep your turns short (2–3 sentences) so I do most of the talking.
2. After each of my answers: if I made a mistake (grammar, word choice, unnatural phrasing), briefly say "Correction:" and give the correct version. Then ask me to repeat the corrected sentence. Only then continue the conversation.
3. Pay special attention to typical German mistakes: tenses (present perfect vs. past simple), since/for, word order, false friends, missing articles, "make vs. do".
4. If I say something correct but unnatural, show me how a native speaker would say it.
5. If I switch to German or get stuck, help me with a short phrase and let me try again.
6. Be encouraging, but don't let mistakes slide.
7. When I say "end session": list my 5 most important mistakes, one per line, exactly in this format:
Wrong sentence → Correct sentence — short explanation in German
Then add 3 useful phrases from today.`;
}

// Erklärung, warum die App so aufgebaut ist
const WHY = [
  ["Erst selbst sprechen, dann Lösung sehen", "Wer eine Antwort aus dem Gedächtnis holt, behält sie deutlich besser als jemand, der sie nur liest (Abruf-Übung). Deshalb sprichst du immer zuerst."],
  ["Wiederholung in wachsenden Abständen", "Was sitzt, kommt nach 1, 3, 7, 14, 30 Tagen wieder. Was nicht sitzt, kommt morgen. So übst du genau das, was du gerade zu vergessen beginnst."],
  ["Fehler kommen in derselben Runde zurück", "Falsche Antworten tauchen ein paar Übungen später noch einmal auf. Am Ende jeder Runde hast du jeden Satz einmal richtig gesagt."],
  ["Gemischte Übungen", "Grammatik, Job-Sätze und deine Fehler wechseln sich ab. Das fühlt sich schwerer an, bleibt aber oft länger hängen als Blöcke vom selben Typ."],
  ["Deine eigenen Fehler", "Fehler aus dem Tutor-Gespräch werden zu Karten. Was dich betrifft, merkst du dir besser als fremde Beispiele."],
  ["Feste Zeit, fester Ort", "Wer vorher festlegt „Wenn ich X tue, übe ich Englisch“, hält deutlich öfter durch. Dafür ist die Kalender-Erinnerung da."],
  ["Kurz-Training und Joker", "Ein ausgelassener Tag ist kein Problem, zwei hintereinander schon. Der Joker rettet deine Serie einmal pro Woche, das 5-Minuten-Training rettet schlechte Tage."],
  ["Fortschritt, den du hörst", "Die Wochen-Aufnahme zeigt dir, wie du dich verbesserst. Gemessen wird, wie viel sitzt, nicht wie lange du geübt hast."],
  ["Am Ende ein Erfolg", "Jede Runde endet mit einem Satz, den du schon kannst. Wie eine Erfahrung endet, prägt, wie gern du wiederkommst."],
];

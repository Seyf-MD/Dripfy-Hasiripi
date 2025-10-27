import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';

type Language = 'en' | 'tr' | 'de' | 'ru' | 'ar';
type Translations = { [key: string]: any };

const languageDirections: { [key in Language]: 'ltr' | 'rtl' } = {
  en: 'ltr',
  tr: 'ltr',
  de: 'ltr',
  ru: 'ltr',
  ar: 'rtl',
};

// Inlined translation data to fix module loading issues
const en = {
  "login": {
    "subtitle": "Pioneering Longevity Solutions",
    "emailPlaceholder": "Email address",
    "passwordPlaceholder": "Password",
    "signInButton": "Sign In"
  },
  "signup": {
    "prompt": "Don't have an account? Sign up",
    "loginPrompt": "Already have an account? Sign in",
    "namePlaceholder": "Full Name",
    "emailPlaceholder": "Email address",
    "phonePlaceholder": "Phone Number",
    "passwordPlaceholder": "Password",
    "signUpButton": "Sign Up",
    "requestReceived": "Sign-up request received. An admin will review it shortly."
  },
  "positions": {
    "CEO": "CEO",
    "CTO": "CTO",
    "CFO": "CFO",
    "COO": "COO",
    "HeadofDepartment": "Head of Department",
    "TeamLead": "Team Lead",
    "ProjectManager": "Project Manager",
    "SeniorSpecialist": "Senior Specialist",
    "JuniorSpecialist": "Junior Specialist",
    "Intern": "Intern"
  },
  "header": {
    "subtitle": "Pioneering Longevity Solutions",
    "inviteButton": "Invite Team"
  },
  "statCards": {
    "totalMeetings": "Total Meetings",
    "meetingsThisWeek": "5 new this week",
    "pendingPayments": "Pending Payments",
    "startThisWeek": "Start this week",
    "activeEscrows": "Active Escrows",
    "inCompensation": "In Compensation",
    "testCondition": "Test Condition"
  },
  "tabs": {
    "calendar": "Calendar",
    "financials": "Financials",
    "challenges": "Challenges",
    "contacts": "Contacts",
    "tasks": "Tasks",
    "adminPanel": "Admin Panel"
  },
  "footer": {
    "links": "Links",
    "followUs": "Follow Us",
    "copyright": "© 2024 Dripfy GmbH. All Rights Reserved.",
    "imprint": "Imprint",
    "privacy": "Privacy",
    "terms": "Terms"
  },
  "chatbot": {
    "toggle": "Toggle Chatbot",
    "header": "Dripfy AI",
    "subtitle": "Your dashboard assistant",
    "clear": "Clear Chat",
    "initialMessage": "Hello! I'm Dripfy AI. I can analyze the data on your dashboard. How can I help you today?",
    "examplePrompts": "Example Prompts",
    "prompt1": "What are the high-priority tasks for this week?",
    "prompt2": "Summarize the main challenges.",
    "prompt3": "Who is the contact for Lifespin?",
    "prompt4": "Are there any overdue payments?",
    "placeholder": "Ask about your data...",
    "send": "Send Message",
    "error": "Sorry, I encountered an error. Please try again."
  },
  "modal": {
    "createNew": "Create New",
    "edit": "Edit",
    "delete": "Delete",
    "create": "Create",
    "save": "Save Changes",
    "noFields": "No editable fields for this item type.",
    "type": "Type",
    "status": "Status",
    "dueDate": "Due Date",
    "schedule": {
      "title": "Title",
      "day": "Day",
      "time": "Time",
      "participants": "Participants (comma-separated)"
    },
    "financials": {
      "description": "Description",
      "amount": "Amount"
    },
    "challenges": {
      "title": "Title",
      "description": "Description",
      "severity": "Severity"
    },
    "advantages": {
      "title": "Title",
      "description": "Description"
    },
    "contacts": {
      "name": "Name",
      "role": "Role",
      "email": "Email",
      "phone": "Phone"
    },
    "tasks": {
      "title": "Title",
      "assignee": "Assignee",
      "priority": "Priority"
    },
    "users": {
      "name": "Name",
      "email": "Email",
      "role": "Role"
    }
  },
  "calendar": {
    "today": "Today",
    "openPicker": "Open date picker",
    "month": "Month",
    "week": "Week",
    "newEvent": "New Event",
    "addEventTo": "Add new event to",
    "dayNames": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  },
  "financials": {
    "newRecord": "New Financial Record",
    "description": "Description",
    "amount": "Amount",
    "status": "Status",
    "dueDate": "Due Date"
  },
  "challenges": {
    "title": "Challenges",
    "add": "Add Challenge"
  },
  "advantages": {
    "title": "Advantages",
    "add": "Add Advantage"
  },
  "contacts": {
    "newContact": "New Contact"
  },
  "tasks": {
    "newTask": "New Task",
    "task": "Task",
    "assignee": "Assignee",
    "priority": "Priority",
    "status": "Status",
    "dueDate": "Due Date"
  },
  "admin": {
    "userPermissions": "User Permissions",
    "auditLog": "Audit Log",
    "signupRequests": "Sign-up Requests",
    "approve": "Approve",
    "deny": "Deny",
    "by": "by",
    "noRequests": "No pending sign-up requests."
  },
  "priority": {
    "high": "High",
    "medium": "Medium",
    "low": "Low"
  },
  "status": {
    "paid": "Paid",
    "pending": "Pending",
    "overdue": "Overdue"
  },
  "taskStatus": {
    "ToDo": "To Do",
    "InProgress": "In Progress",
    "Done": "Done"
  },
  "userRoles": {
    "admin": "Admin",
    "user": "User"
  },
  "days": {
    "monday": "Monday",
    "tuesday": "Tuesday",
    "wednesday": "Wednesday",
    "thursday": "Thursday",
    "friday": "Friday",
    "saturday": "Saturday",
    "sunday": "Sunday"
  },
  "daysShort": {
    "mon": "Mon",
    "tue": "Tue",
    "wed": "Wed",
    "thu": "Thu",
    "fri": "Fri",
    "sat": "Sat",
    "sun": "Sun"
  },
  "dataTypes": {
    "schedule": "Event",
    "financial": "Financial Record",
    "challenge": "Challenge",
    "advantage": "Advantage",
    "contact": "Contact",
    "task": "Task",
    "user": "User",
    "signupRequest": "Sign-up Request"
  },
  "auditLogActions": {
    "Created": "Created",
    "Updated": "Updated",
    "Deleted": "Deleted",
    "Approved": "Approved",
    "Denied": "Denied"
  },
  "auditLogMessages": {
    "updateTask": "Updated task \"{{title}}\": set {{field}} to \"{{value}}\"",
    "newSignup": "New sign-up request from {{name}}",
    "approvedSignup": "Approved sign-up for {{name}}",
    "deniedSignup": "Denied sign-up for {{name}}"
  },
  "confirmDelete": "Are you sure you want to delete this item?"
};
const tr = {
  "login": {
    "subtitle": "Uzun Yaşamda İnovasyon Platformu",
    "emailPlaceholder": "E-posta adresi",
    "passwordPlaceholder": "Şifre",
    "signInButton": "Giriş Yap"
  },
  "signup": {
    "prompt": "Hesabınız yok mu? Kaydolun",
    "loginPrompt": "Zaten bir hesabınız var mı? Giriş yapın",
    "namePlaceholder": "Ad Soyad",
    "emailPlaceholder": "E-posta adresi",
    "phonePlaceholder": "Telefon Numarası",
    "passwordPlaceholder": "Şifre",
    "signUpButton": "Kaydol",
    "requestReceived": "Kayıt talebiniz alındı. Bir yönetici kısa süre içinde inceleyecektir."
  },
  "positions": {
    "CEO": "CEO",
    "CTO": "CTO",
    "CFO": "CFO",
    "COO": "COO",
    "HeadofDepartment": "Departman Başkanı",
    "TeamLead": "Takım Lideri",
    "ProjectManager": "Proje Yöneticisi",
    "SeniorSpecialist": "Kıdemli Uzman",
    "JuniorSpecialist": "Uzman Yardımcısı",
    "Intern": "Stajyer"
  },
  "header": {
    "subtitle": "Uzun Yaşamda İnovasyon Platformu",
    "inviteButton": "Takımı Davet Et"
  },
  "statCards": {
    "totalMeetings": "Toplam Toplantı",
    "meetingsThisWeek": "Bu hafta 5 yeni",
    "pendingPayments": "Bekleyen Ödemeler",
    "startThisWeek": "Bu hafta başla",
    "activeEscrows": "Aktif Emanetler",
    "inCompensation": "Tazminat Aşamasında",
    "testCondition": "Test Durumu"
  },
  "tabs": {
    "calendar": "Takvim",
    "financials": "Finans",
    "challenges": "Zorluklar",
    "contacts": "Kişiler",
    "tasks": "Görevler",
    "adminPanel": "Yönetici Paneli"
  },
  "footer": {
    "links": "Bağlantılar",
    "followUs": "Bizi Takip Edin",
    "copyright": "© 2024 Dripfy GmbH. Tüm Hakları Saklıdır.",
    "imprint": "Künye",
    "privacy": "Gizlilik",
    "terms": "Şartlar"
  },
  "chatbot": {
    "toggle": "Sohbet Robotunu Aç/Kapat",
    "header": "Dripfy AI",
    "subtitle": "Kontrol paneli asistanınız",
    "clear": "Sohbeti Temizle",
    "initialMessage": "Merhaba! Ben Dripfy AI. Kontrol panelinizdeki verileri analiz edebilirim. Bugün size nasıl yardımcı olabilirim?",
    "examplePrompts": "Örnek Sorular",
    "prompt1": "Bu haftanın yüksek öncelikli görevleri neler?",
    "prompt2": "Ana zorlukları özetle.",
    "prompt3": "Lifespin için ilgili kişi kim?",
    "prompt4": "Gecikmiş ödeme var mı?",
    "placeholder": "Verileriniz hakkında soru sorun...",
    "send": "Gönder",
    "error": "Üzgünüm, bir hatayla karşılaştım. Lütfen tekrar deneyin."
  },
  "modal": {
    "createNew": "Yeni Oluştur",
    "edit": "Düzenle",
    "delete": "Sil",
    "create": "Oluştur",
    "save": "Değişiklikleri Kaydet",
    "noFields": "Bu öğe türü için düzenlenebilir alan yok.",
    "type": "Tür",
    "status": "Durum",
    "dueDate": "Bitiş Tarihi",
    "schedule": {
      "title": "Başlık",
      "day": "Gün",
      "time": "Saat",
      "participants": "Katılımcılar (virgülle ayrılmış)"
    },
    "financials": {
      "description": "Açıklama",
      "amount": "Miktar"
    },
    "challenges": {
      "title": "Başlık",
      "description": "Açıklama",
      "severity": "Önem Derecesi"
    },
    "advantages": {
      "title": "Başlık",
      "description": "Açıklama"
    },
    "contacts": {
      "name": "İsim",
      "role": "Rol",
      "email": "E-posta",
      "phone": "Telefon"
    },
    "tasks": {
      "title": "Başlık",
      "assignee": "Atanan Kişi",
      "priority": "Öncelik"
    },
    "users": {
      "name": "İsim",
      "email": "E-posta",
      "role": "Rol"
    }
  },
  "calendar": {
    "today": "Bugün",
    "openPicker": "Tarih seçiciyi aç",
    "month": "Ay",
    "week": "Hafta",
    "newEvent": "Yeni Etkinlik",
    "addEventTo": "Şu tarihe yeni etkinlik ekle:",
    "dayNames": ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"]
  },
  "financials": {
    "newRecord": "Yeni Finansal Kayıt",
    "description": "Açıklama",
    "amount": "Miktar",
    "status": "Durum",
    "dueDate": "Vade Tarihi"
  },
  "challenges": {
    "title": "Zorluklar",
    "add": "Zorluk Ekle"
  },
  "advantages": {
    "title": "Avantajlar",
    "add": "Avantaj Ekle"
  },
  "contacts": {
    "newContact": "Yeni Kişi"
  },
  "tasks": {
    "newTask": "Yeni Görev",
    "task": "Görev",
    "assignee": "Atanan",
    "priority": "Öncelik",
    "status": "Durum",
    "dueDate": "Bitiş Tarihi"
  },
  "admin": {
    "userPermissions": "Kullanıcı İzinleri",
    "auditLog": "Denetim Kaydı",
    "signupRequests": "Kayıt İstekleri",
    "approve": "Onayla",
    "deny": "Reddet",
    "by": "",
    "noRequests": "Bekleyen kayıt isteği yok."
  },
  "priority": {
    "high": "Yüksek",
    "medium": "Orta",
    "low": "Düşük"
  },
  "status": {
    "paid": "Ödendi",
    "pending": "Beklemede",
    "overdue": "Gecikmiş"
  },
  "taskStatus": {
    "ToDo": "Yapılacak",
    "InProgress": "Devam Ediyor",
    "Done": "Bitti"
  },
  "userRoles": {
    "admin": "Yönetici",
    "user": "Kullanıcı"
  },
  "days": {
    "monday": "Pazartesi",
    "tuesday": "Salı",
    "wednesday": "Çarşamba",
    "thursday": "Perşembe",
    "friday": "Cuma",
    "saturday": "Cumartesi",
    "sunday": "Pazar"
  },
  "daysShort": {
    "mon": "Pzt",
    "tue": "Sal",
    "wed": "Çar",
    "thu": "Per",
    "fri": "Cum",
    "sat": "Cmt",
    "sun": "Paz"
  },
  "dataTypes": {
    "schedule": "Etkinlik",
    "financial": "Finansal Kayıt",
    "challenge": "Zorluk",
    "advantage": "Avantaj",
    "contact": "Kişi",
    "task": "Görev",
    "user": "Kullanıcı",
    "signupRequest": "Kayıt İsteği"
  },
  "auditLogActions": {
    "Created": "Oluşturuldu",
    "Updated": "Güncellendi",
    "Deleted": "Silindi",
    "Approved": "Onaylandı",
    "Denied": "Reddedildi"
  },
  "auditLogMessages": {
    "updateTask": "\"{{title}}\" görevi güncellendi: {{field}} alanı \"{{value}}\" olarak ayarlandı",
    "newSignup": "{{name}} tarafından yeni kayıt isteği",
    "approvedSignup": "{{name}} için kayıt onaylandı",
    "deniedSignup": "{{name}} için kayıt reddedildi"
  },
  "confirmDelete": "Bu öğeyi silmek istediğinizden emin misiniz?"
};
const de = {
  "login": {
    "subtitle": "Wegweisende Langlebigkeitslösungen",
    "emailPlaceholder": "E-Mail-Adresse",
    "passwordPlaceholder": "Passwort",
    "signInButton": "Anmelden"
  },
  "signup": {
    "prompt": "Kein Konto? Registrieren",
    "loginPrompt": "Bereits ein Konto? Anmelden",
    "namePlaceholder": "Vollständiger Name",
    "emailPlaceholder": "E-Mail-Adresse",
    "phonePlaceholder": "Telefonnummer",
    "passwordPlaceholder": "Passwort",
    "signUpButton": "Registrieren",
    "requestReceived": "Registrierungsanfrage erhalten. Ein Administrator wird sie in Kürze prüfen."
  },
  "positions": {
    "CEO": "CEO",
    "CTO": "CTO",
    "CFO": "CFO",
    "COO": "COO",
    "HeadofDepartment": "Abteilungsleiter",
    "TeamLead": "Teamleiter",
    "ProjectManager": "Projektmanager",
    "SeniorSpecialist": "Senior-Spezialist",
    "JuniorSpecialist": "Junior-Spezialist",
    "Intern": "Praktikant"
  },
  "header": {
    "subtitle": "Wegweisende Langlebigkeitslösungen",
    "inviteButton": "Team einladen"
  },
  "statCards": {
    "totalMeetings": "Meetings insgesamt",
    "meetingsThisWeek": "5 neue diese Woche",
    "pendingPayments": "Ausst. Zahlungen",
    "startThisWeek": "Diese Woche starten",
    "activeEscrows": "Aktive Treuhandkonten",
    "inCompensation": "In Entschädigung",
    "testCondition": "Testzustand"
  },
  "tabs": {
    "calendar": "Kalender",
    "financials": "Finanzen",
    "challenges": "Herausforderungen",
    "contacts": "Kontakte",
    "tasks": "Aufgaben",
    "adminPanel": "Admin-Panel"
  },
  "footer": {
    "links": "Links",
    "followUs": "Folgen Sie uns",
    "copyright": "© 2024 Dripfy GmbH. Alle Rechte vorbehalten.",
    "imprint": "Impressum",
    "privacy": "Datenschutz",
    "terms": "AGB"
  },
  "chatbot": {
    "toggle": "Chatbot umschalten",
    "header": "Dripfy AI",
    "subtitle": "Ihr Dashboard-Assistent",
    "clear": "Chat leeren",
    "initialMessage": "Hallo! Ich bin Dripfy AI. Ich kann die Daten auf Ihrem Dashboard analysieren. Wie kann ich Ihnen heute helfen?",
    "examplePrompts": "Beispielanfragen",
    "prompt1": "Was sind die Aufgaben mit hoher Priorität für diese Woche?",
    "prompt2": "Fassen Sie die größten Herausforderungen zusammen.",
    "prompt3": "Wer ist der Ansprechpartner für Lifespin?",
    "prompt4": "Gibt es überfällige Zahlungen?",
    "placeholder": "Fragen Sie nach Ihren Daten...",
    "send": "Senden",
    "error": "Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
  },
  "modal": {
    "createNew": "Neu erstellen",
    "edit": "Bearbeiten",
    "delete": "Löschen",
    "create": "Erstellen",
    "save": "Änderungen speichern",
    "noFields": "Keine bearbeitbaren Felder für diesen Elementtyp.",
    "type": "Typ",
    "status": "Status",
    "dueDate": "Fälligkeitsdatum",
    "schedule": {
      "title": "Titel",
      "day": "Tag",
      "time": "Uhrzeit",
      "participants": "Teilnehmer (kommagetrennt)"
    },
    "financials": {
      "description": "Beschreibung",
      "amount": "Betrag"
    },
    "challenges": {
      "title": "Titel",
      "description": "Beschreibung",
      "severity": "Schweregrad"
    },
    "advantages": {
      "title": "Titel",
      "description": "Beschreibung"
    },
    "contacts": {
      "name": "Name",
      "role": "Rolle",
      "email": "E-Mail",
      "phone": "Telefon"
    },
    "tasks": {
      "title": "Titel",
      "assignee": "Zuständig",
      "priority": "Priorität"
    },
    "users": {
      "name": "Name",
      "email": "E-Mail",
      "role": "Rolle"
    }
  },
  "calendar": {
    "today": "Heute",
    "openPicker": "Datumsauswahl öffnen",
    "month": "Monat",
    "week": "Woche",
    "newEvent": "Neuer Termin",
    "addEventTo": "Neuen Termin hinzufügen zu",
    "dayNames": ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]
  },
  "financials": {
    "newRecord": "Neuer Finanzdatensatz",
    "description": "Beschreibung",
    "amount": "Betrag",
    "status": "Status",
    "dueDate": "Fälligkeitsdatum"
  },
  "challenges": {
    "title": "Herausforderungen",
    "add": "Herausforderung hinzufügen"
  },
  "advantages": {
    "title": "Vorteile",
    "add": "Vorteil hinzufügen"
  },
  "contacts": {
    "newContact": "Neuer Kontakt"
  },
  "tasks": {
    "newTask": "Neue Aufgabe",
    "task": "Aufgabe",
    "assignee": "Zuständig",
    "priority": "Priorität",
    "status": "Status",
    "dueDate": "Fällig am"
  },
  "admin": {
    "userPermissions": "Benutzerberechtigungen",
    "auditLog": "Prüfprotokoll",
    "signupRequests": "Registrierungsanfragen",
    "approve": "Genehmigen",
    "deny": "Ablehnen",
    "by": "von",
    "noRequests": "Keine ausstehenden Registrierungsanfragen."
  },
  "priority": {
    "high": "Hoch",
    "medium": "Mittel",
    "low": "Niedrig"
  },
  "status": {
    "paid": "Bezahlt",
    "pending": "Ausstehend",
    "overdue": "Überfällig"
  },
  "taskStatus": {
    "ToDo": "Zu erledigen",
    "InProgress": "In Arbeit",
    "Done": "Erledigt"
  },
  "userRoles": {
    "admin": "Admin",
    "user": "Benutzer"
  },
  "days": {
    "monday": "Montag",
    "tuesday": "Dienstag",
    "wednesday": "Mittwoch",
    "thursday": "Donnerstag",
    "friday": "Freitag",
    "saturday": "Samstag",
    "sunday": "Sonntag"
  },
  "daysShort": {
    "mon": "Mo",
    "tue": "Di",
    "wed": "Mi",
    "thu": "Do",
    "fri": "Fr",
    "sat": "Sa",
    "sun": "So"
  },
  "dataTypes": {
    "schedule": "Termin",
    "financial": "Finanzdatensatz",
    "challenge": "Herausforderung",
    "advantage": "Vorteil",
    "contact": "Kontakt",
    "task": "Aufgabe",
    "user": "Benutzer",
    "signupRequest": "Registrierungsanfrage"
  },
  "auditLogActions": {
    "Created": "Erstellt",
    "Updated": "Aktualisiert",
    "Deleted": "Gelöscht",
    "Approved": "Genehmigt",
    "Denied": "Abgelehnt"
  },
  "auditLogMessages": {
    "updateTask": "Aufgabe \"{{title}}\" aktualisiert: {{field}} auf \"{{value}}\" gesetzt",
    "newSignup": "Neue Registrierungsanfrage von {{name}}",
    "approvedSignup": "Registrierung für {{name}} genehmigt",
    "deniedSignup": "Registrierung für {{name}} abgelehnt"
  },
  "confirmDelete": "Möchten Sie dieses Element wirklich löschen?"
};
const ru = {
  "login": {
    "subtitle": "Инновационные решения для долголетия",
    "emailPlaceholder": "Адрес электронной почты",
    "passwordPlaceholder": "Пароль",
    "signInButton": "Войти"
  },
  "signup": {
    "prompt": "Нет аккаунта? Зарегистрироваться",
    "loginPrompt": "Уже есть аккаунт? Войти",
    "namePlaceholder": "Полное имя",
    "emailPlaceholder": "Адрес электронной почты",
    "phonePlaceholder": "Номер телефона",
    "passwordPlaceholder": "Пароль",
    "signUpButton": "Зарегистрироваться",
    "requestReceived": "Запрос на регистрацию получен. Администратор рассмотрит его в ближайшее время."
  },
  "positions": {
    "CEO": "Генеральный директор",
    "CTO": "Технический директор",
    "CFO": "Финансовый директор",
    "COO": "Операционный директор",
    "HeadofDepartment": "Начальник отдела",
    "TeamLead": "Руководитель группы",
    "ProjectManager": "Менеджер проекта",
    "SeniorSpecialist": "Старший специалист",
    "JuniorSpecialist": "Младший специалист",
    "Intern": "Стажер"
  },
  "header": {
    "subtitle": "Инновационные решения для долголетия",
    "inviteButton": "Пригласить команду"
  },
  "statCards": {
    "totalMeetings": "Всего встреч",
    "meetingsThisWeek": "5 новых на этой неделе",
    "pendingPayments": "Ожидающие платежи",
    "startThisWeek": "Начать на этой неделе",
    "activeEscrows": "Активные эскроу",
    "inCompensation": "В компенсации",
    "testCondition": "Тестовое состояние"
  },
  "tabs": {
    "calendar": "Календарь",
    "financials": "Финансы",
    "challenges": "Проблемы",
    "contacts": "Контакты",
    "tasks": "Задачи",
    "adminPanel": "Панель администратора"
  },
  "footer": {
    "links": "Ссылки",
    "followUs": "Подписывайтесь на нас",
    "copyright": "© 2024 Dripfy GmbH. Все права защищены.",
    "imprint": "Выходные данные",
    "privacy": "Конфиденциальность",
    "terms": "Условия"
  },
  "chatbot": {
    "toggle": "Переключить чат-бота",
    "header": "Dripfy AI",
    "subtitle": "Ваш помощник по панели управления",
    "clear": "Очистить чат",
    "initialMessage": "Здравствуйте! Я Dripfy AI. Я могу анализировать данные на вашей панели управления. Чем я могу вам сегодня помочь?",
    "examplePrompts": "Примеры запросов",
    "prompt1": "Какие задачи с высоким приоритетом на эту неделю?",
    "prompt2": "Обобщите основные проблемы.",
    "prompt3": "Кто является контактным лицом для Lifespin?",
    "prompt4": "Есть ли просроченные платежи?",
    "placeholder": "Спросите о ваших данных...",
    "send": "Отправить",
    "error": "К сожалению, произошла ошибка. Пожалуйста, попробуйте еще раз."
  },
  "modal": {
    "createNew": "Создать",
    "edit": "Редактировать",
    "delete": "Удалить",
    "create": "Создать",
    "save": "Сохранить изменения",
    "noFields": "Для этого типа элемента нет редактируемых полей.",
    "type": "Тип",
    "status": "Статус",
    "dueDate": "Срок выполнения",
    "schedule": {
      "title": "Название",
      "day": "День",
      "time": "Время",
      "participants": "Участники (через запятую)"
    },
    "financials": {
      "description": "Описание",
      "amount": "Сумма"
    },
    "challenges": {
      "title": "Название",
      "description": "Описание",
      "severity": "Серьезность"
    },
    "advantages": {
      "title": "Название",
      "description": "Описание"
    },
    "contacts": {
      "name": "Имя",
      "role": "Роль",
      "email": "Эл. почта",
      "phone": "Телефон"
    },
    "tasks": {
      "title": "Название",
      "assignee": "Исполнитель",
      "priority": "Приоритет"
    },
    "users": {
      "name": "Имя",
      "email": "Эл. почта",
      "role": "Роль"
    }
  },
  "calendar": {
    "today": "Сегодня",
    "openPicker": "Открыть выбор даты",
    "month": "Месяц",
    "week": "Неделя",
    "newEvent": "Новое событие",
    "addEventTo": "Добавить новое событие в",
    "dayNames": ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"]
  },
  "financials": {
    "newRecord": "Новая финансовая запись",
    "description": "Описание",
    "amount": "Сумма",
    "status": "Статус",
    "dueDate": "Срок оплаты"
  },
  "challenges": {
    "title": "Проблемы",
    "add": "Добавить проблему"
  },
  "advantages": {
    "title": "Преимущества",
    "add": "Добавить преимущество"
  },
  "contacts": {
    "newContact": "Новый контакт"
  },
  "tasks": {
    "newTask": "Новая задача",
    "task": "Задача",
    "assignee": "Исполнитель",
    "priority": "Приоритет",
    "status": "Статус",
    "dueDate": "Срок"
  },
  "admin": {
    "userPermissions": "Права пользователей",
    "auditLog": "Журнал аудита",
    "signupRequests": "Запросы на регистрацию",
    "approve": "Одобрить",
    "deny": "Отклонить",
    "by": "",
    "noRequests": "Нет ожидающих запросов на регистрацию."
  },
  "priority": {
    "high": "Высокий",
    "medium": "Средний",
    "low": "Низкий"
  },
  "status": {
    "paid": "Оплачено",
    "pending": "В ожидании",
    "overdue": "Просрочено"
  },
  "taskStatus": {
    "ToDo": "К выполнению",
    "InProgress": "В процессе",
    "Done": "Выполнено"
  },
  "userRoles": {
    "admin": "Администратор",
    "user": "Пользователь"
  },
  "days": {
    "monday": "Понедельник",
    "tuesday": "Вторник",
    "wednesday": "Среда",
    "thursday": "Четверг",
    "friday": "Пятница",
    "saturday": "Суббота",
    "sunday": "Воскресенье"
  },
  "daysShort": {
    "mon": "Пн",
    "tue": "Вт",
    "wed": "Ср",
    "thu": "Чт",
    "fri": "Пт",
    "sat": "Сб",
    "sun": "Вс"
  },
  "dataTypes": {
    "schedule": "Событие",
    "financial": "Финансовая запись",
    "challenge": "Проблема",
    "advantage": "Преимущество",
    "contact": "Контакт",
    "task": "Задача",
    "user": "Пользователь",
    "signupRequest": "Запрос на регистрацию"
  },
  "auditLogActions": {
    "Created": "Создано",
    "Updated": "Обновлено",
    "Deleted": "Удалено",
    "Approved": "Одобрено",
    "Denied": "Отклонено"
  },
  "auditLogMessages": {
    "updateTask": "Задача \"{{title}}\" обновлена: поле {{field}} установлено в \"{{value}}\"",
    "newSignup": "Новый запрос на регистрацию от {{name}}",
    "approvedSignup": "Регистрация для {{name}} одобрена",
    "deniedSignup": "Регистрация для {{name}} отклонена"
  },
  "confirmDelete": "Вы уверены, что хотите удалить этот элемент?"
};
const ar = {
  "login": {
    "subtitle": "حلول رائدة لطول العمر",
    "emailPlaceholder": "عنوان البريد الإلكتروني",
    "passwordPlaceholder": "كلمة المرور",
    "signInButton": "تسجيل الدخول"
  },
  "signup": {
    "prompt": "ليس لديك حساب؟ اشتراك",
    "loginPrompt": "هل لديك حساب بالفعل؟ تسجيل الدخول",
    "namePlaceholder": "الاسم الكامل",
    "emailPlaceholder": "عنوان البريد الإلكتروني",
    "phonePlaceholder": "رقم الهاتف",
    "passwordPlaceholder": "كلمة المرور",
    "signUpButton": "اشتراك",
    "requestReceived": "تم استلام طلب التسجيل. سيقوم المسؤول بمراجعته قريبًا."
  },
  "positions": {
    "CEO": "الرئيس التنفيذي",
    "CTO": "المدير التقني",
    "CFO": "المدير المالي",
    "COO": "مدير العمليات",
    "HeadofDepartment": "رئيس قسم",
    "TeamLead": "قائد فريق",
    "ProjectManager": "مدير مشروع",
    "SeniorSpecialist": "أخصائي أول",
    "JuniorSpecialist": "أخصائي مبتدئ",
    "Intern": "متدرب"
  },
  "header": {
    "subtitle": "حلول رائدة لطول العمر",
    "inviteButton": "دعوة فريق"
  },
  "statCards": {
    "totalMeetings": "إجمالي الاجتماعات",
    "meetingsThisWeek": "5 جديدة هذا الأسبوع",
    "pendingPayments": "المدفوعات المعلقة",
    "startThisWeek": "ابدأ هذا الأسبوع",
    "activeEscrows": "الضمانات النشطة",
    "inCompensation": "في التعويض",
    "testCondition": "حالة الاختبار"
  },
  "tabs": {
    "calendar": "التقويم",
    "financials": "المالية",
    "challenges": "التحديات",
    "contacts": "جهات الاتصال",
    "tasks": "المهام",
    "adminPanel": "لوحة الإدارة"
  },
  "footer": {
    "links": "روابط",
    "followUs": "تابعنا",
    "copyright": "© 2024 Dripfy GmbH. كل الحقوق محفوظة.",
    "imprint": "بيانات النشر",
    "privacy": "الخصوصية",
    "terms": "الشروط"
  },
  "chatbot": {
    "toggle": "تبديل روبوت المحادثة",
    "header": "Dripfy AI",
    "subtitle": "مساعد لوحة التحكم الخاص بك",
    "clear": "مسح المحادثة",
    "initialMessage": "مرحبًا! أنا Dripfy AI. يمكنني تحليل البيانات على لوحة التحكم الخاصة بك. كيف يمكنني مساعدتك اليوم؟",
    "examplePrompts": "أمثلة على الأسئلة",
    "prompt1": "ما هي المهام ذات الأولوية العالية لهذا الأسبوع؟",
    "prompt2": "لخص التحديات الرئيسية.",
    "prompt3": "من هو جهة الاتصال لـ Lifespin؟",
    "prompt4": "هل هناك أي مدفوعات متأخرة؟",
    "placeholder": "اسأل عن بياناتك ...",
    "send": "إرسال",
    "error": "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى."
  },
  "modal": {
    "createNew": "إنشاء جديد",
    "edit": "تعديل",
    "delete": "حذف",
    "create": "إنشاء",
    "save": "حفظ التغييرات",
    "noFields": "لا توجد حقول قابلة للتعديل لهذا النوع من العناصر.",
    "type": "النوع",
    "status": "الحالة",
    "dueDate": "تاريخ الاستحقاق",
    "schedule": {
      "title": "العنوان",
      "day": "اليوم",
      "time": "الوقت",
      "participants": "المشاركون (مفصولون بفاصلة)"
    },
    "financials": {
      "description": "الوصف",
      "amount": "المبلغ"
    },
    "challenges": {
      "title": "العنوان",
      "description": "الوصف",
      "severity": "الخطورة"
    },
    "advantages": {
      "title": "العنوان",
      "description": "الوصف"
    },
    "contacts": {
      "name": "الاسم",
      "role": "الدور",
      "email": "البريد الإلكتروني",
      "phone": "الهاتف"
    },
    "tasks": {
      "title": "العنوان",
      "assignee": "المكلف",
      "priority": "الأولوية"
    },
    "users": {
      "name": "الاسم",
      "email": "البريد الإلكتروني",
      "role": "الدور"
    }
  },
  "calendar": {
    "today": "اليوم",
    "openPicker": "فتح منتقي التاريخ",
    "month": "شهر",
    "week": "أسبوع",
    "newEvent": "حدث جديد",
    "addEventTo": "إضافة حدث جديد إلى",
    "dayNames": ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
  },
  "financials": {
    "newRecord": "سجل مالي جديد",
    "description": "الوصف",
    "amount": "المبلغ",
    "status": "الحالة",
    "dueDate": "تاريخ الاستحقاق"
  },
  "challenges": {
    "title": "التحديات",
    "add": "إضافة تحدي"
  },
  "advantages": {
    "title": "المزايا",
    "add": "إضافة ميزة"
  },
  "contacts": {
    "newContact": "جهة اتصال جديدة"
  },
  "tasks": {
    "newTask": "مهمة جديدة",
    "task": "المهمة",
    "assignee": "المكلف",
    "priority": "الأولوية",
    "status": "الحالة",
    "dueDate": "تاريخ الاستحقاق"
  },
  "admin": {
    "userPermissions": "أذونات المستخدم",
    "auditLog": "سجل التدقيق",
    "signupRequests": "طلبات التسجيل",
    "approve": "موافقة",
    "deny": "رفض",
    "by": "بواسطة",
    "noRequests": "لا توجد طلبات تسجيل معلقة."
  },
  "priority": {
    "high": "عالية",
    "medium": "متوسطة",
    "low": "منخفضة"
  },
  "status": {
    "paid": "مدفوع",
    "pending": "معلق",
    "overdue": "متأخر"
  },
  "taskStatus": {
    "ToDo": "للقيام به",
    "InProgress": "قيد التنفيذ",
    "Done": "تم"
  },
  "userRoles": {
    "admin": "مسؤول",
    "user": "مستخدم"
  },
  "days": {
    "monday": "الاثنين",
    "tuesday": "الثلاثاء",
    "wednesday": "الأربعاء",
    "thursday": "الخميس",
    "friday": "الجمعة",
    "saturday": "السبت",
    "sunday": "الأحد"
  },
  "daysShort": {
    "mon": "إثن",
    "tue": "ثلا",
    "wed": "أرب",
    "thu": "خمي",
    "fri": "جمع",
    "sat": "سبت",
    "sun": "أحد"
  },
  "dataTypes": {
    "schedule": "حدث",
    "financial": "سجل مالي",
    "challenge": "تحدي",
    "advantage": "ميزة",
    "contact": "جهة اتصال",
    "task": "مهمة",
    "user": "مستخدم",
    "signupRequest": "طلب تسجيل"
  },
  "auditLogActions": {
    "Created": "تم الإنشاء",
    "Updated": "تم التحديث",
    "Deleted": "تم الحذف",
    "Approved": "تمت الموافقة",
    "Denied": "تم الرفض"
  },
  "auditLogMessages": {
    "updateTask": "تم تحديث المهمة \"{{title}}\": تم تعيين {{field}} إلى \"{{value}}\"",
    "newSignup": "طلب تسجيل جديد من {{name}}",
    "approvedSignup": "تمت الموافقة على تسجيل {{name}}",
    "deniedSignup": "تم رفض تسجيل {{name}}"
  },
  "confirmDelete": "هل أنت متأكد أنك تريد حذف هذا العنصر؟"
};


const allTranslations: Record<Language, Translations> = { en, tr, de, ru, ar };

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, options?: { [key: string]: string | number }) => string;
  direction: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
      const storedLang = localStorage.getItem('dripfy-lang');
      return (storedLang && ['en', 'tr', 'de', 'ru', 'ar'].includes(storedLang)) ? storedLang as Language : 'en';
  });

  const setLanguage = (lang: Language) => {
      localStorage.setItem('dripfy-lang', lang);
      setLanguageState(lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = languageDirections[language];
  }, [language]);

  const t = useMemo(() => (key: string, options?: { [key: string]: string | number }): string => {
    const currentTranslations = allTranslations[language];
    const fallbackTranslations = allTranslations['en'];

    const keys = key.split('.');
    
    let result = currentTranslations;
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        let fallbackResult = fallbackTranslations;
        for (const fk of keys) {
            fallbackResult = fallbackResult?.[fk];
            if(fallbackResult === undefined) return key;
        }
        result = fallbackResult;
        break;
      }
    }
    
    let text = typeof result === 'string' ? result : key;

    if (options) {
      Object.keys(options).forEach(k => {
        text = text.replace(`{{${k}}}`, String(options[k]));
      });
    }

    return text;
  }, [language]);
  
  const direction = languageDirections[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, direction }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

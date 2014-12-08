/* All airline companies sorted alphabetically */
var airlinesCompanies = [
    { id: "Aces", text: "Aces Colombia", code: "VX" },
    { id: "Aerolineas", text: "Aerolineas Argentinas", code: "AR" },
    { id: "Aeroméxico", text: "Aeroméxico", code: "AM" },
    { id: "Air Canada", text: "Air Canada", code: "AC" },
    { id: "Air China", text: "Air China", code: "CA" },
    { id: "Air Europa", text: "Air Europa", code: "UX" },
    { id: "Air France", text: "Air France", code: "AF" },
    { id: "Air Nippon Airways", text: "Air Nippon", code: "NH" },
    { id: "Alaska Airlines", text: "Alaska Airlines", code: "AS" },
    { id: "Alitalia", text: "Alitalia", code: "AZ" },
    { id: "American", text: "American Airlines", code: "AA" },
    { id: "Avianca", text: "Avianca", code: "AV,06" },
    { id: "Azul", text: "Azul", code: "AD" },
    { id: "British Airways", text: "British Airways", code: "BA" },
    { id: "Cathay Pacific", text: "Cathay Pacific", code: "CX" },
    { id: "Copa", text: "Copa Airlines", code: "CM" },
    { id: "Delta", text: "Delta Airlines", code: "DL" },
    { id: "El Al", text: "El Al", code: "LY" },
    { id: "Emirates", text: "Emirates", code: "EK" },
    { id: "Ethiopian Airlines", text: "Ethiopian Airlines", code: "ET" },
    { id: "Etihad Airways", text: "Etihad Airways", code: "EY" },
    { id: "Frontier", text: "Frontier", code: "F9" },
    { id: "Gol", text: "Gol", code: "G3" },
    { id: "Iberia", text: "Iberia", code: "IB" },
    { id: "Klm", text: "KLM", code: "KL" },
    { id: "Korean Airlines", text: "Korean Airlines", code: "KE" },
    { id: "LAN", text: "Lan", code: "LA" },
    { id: "Lufthansa", text: "Lufthansa", code: "LH" },
    { id: "Passaredo", text: "Passaredo", code: "P3" },
    { id: "Qantas Airways", text: "Qantas", code: "QF" },
    { id: "Qatar Airways", text: "Qatar Airways", code: "QR" },
    { id: "South African Airways", text: "South African", code: "SA" },
    { id: "Singapore Arlns", text: "Singapore Airlines", code: "SQ" },
    { id: "Swiss", text: "Swiss", code: "LX" },
    { id: "Sun Country Arlns", text: "Sun Country", code: "SY" },
    { id: "TAAG-Angola", text: "Taag Airlines", code: "DT" },
    { id: "TACA", text: "Taca", code: "TA" },
    { id: "Tam", text: "Tam", code: "JJ" },
    { id: "Tap", text: "Tap", code: "TP" },
    { id: "Turkish", text: "Turkish", code: "TK" },
    { id: "United", text: "United Airlines", code: "UA" },
    { id: "US Airways", text: "US Airways", code: "US" },
    { id: "Virgin Atlantic", text: "Virgin Atlantic", code: "VS" },
    { id: "Multiple Carries", text: "Múltiplas", code: "*" }
];

var airlinesCompaniesByCode = {};
for(var i in airlinesCompanies) airlinesCompaniesByCode[airlinesCompanies[i].code] = airlinesCompanies[i].text;

var airlinesCompaniesById = {};
for(var i in airlinesCompanies) airlinesCompaniesById[airlinesCompanies[i].id] = airlinesCompanies[i];
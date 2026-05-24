const fs = require('fs');
let c = fs.readFileSync('src/pages/Reports.tsx', 'utf8');
c = c.replace(/className="bg-white text-black/g, 'className="bg-background text-foreground print:bg-white print:text-black');
c = c.replace(/border-black\/20/g, 'border-foreground/20 print:border-black/20');
c = c.replace(/border-black/g, 'border-foreground print:border-black');
c = c.replace(/text-black/g, 'text-foreground print:text-black');
c = c.replace(/bg-black/g, 'bg-foreground print:bg-black');
c = c.replace(/Disbursement/g, 'Total earnings');
fs.writeFileSync('src/pages/Reports.tsx', c);

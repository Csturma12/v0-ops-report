/* Five Nines Logistics — book of business (existing accounts, not cold leads).
   Source: account list supplied by Chris Sturma, 2026-09-11.
   Only three facts come from that list: the account name, a Houston flag, and an
   owner tag where one was written. `category` is inferred from the account name
   itself and is left "Unclassified" when the name does not say. Nothing here is
   researched — no phones, contacts, or revenue are implied. */
window.BOOK_AS_OF = "2026-09-11";
window.HOUSE_ACCOUNTS = [
  {company_name:"JT Thorpe & Sons – Baton Rouge",        houston:false, owner:"",       category:"Refractory"},
  {company_name:"JT Thorpe & Sons – Pittsburgh",         houston:false, owner:"",       category:"Refractory"},
  {company_name:"JT Thorpe & Sons – Houston",            houston:true,  owner:"",       category:"Refractory"},
  {company_name:"Mesabi Metallics",                      houston:false, owner:"",       category:"Metals & Mining"},
  {company_name:"F.S. Sperry",                           houston:false, owner:"",       category:"Unclassified"},
  {company_name:"Lanexis",                               houston:true,  owner:"",       category:"Unclassified"},
  {company_name:"Buck Ind.",                             houston:true,  owner:"",       category:"Industrial"},
  {company_name:"Legacy Ref.",                           houston:true,  owner:"",       category:"Refractory"},
  {company_name:"Delta Refractories",                    houston:true,  owner:"",       category:"Refractory"},
  {company_name:"Lonestar Services",                     houston:true,  owner:"",       category:"Industrial services"},
  {company_name:"Thorpe Hueytown",                       houston:true,  owner:"",       category:"Refractory"},
  {company_name:"Thorpe Kirbyville / Ranger",            houston:true,  owner:"",       category:"Refractory"},
  {company_name:"Thorpe Plant Services – Beaumont",      houston:true,  owner:"",       category:"Plant services"},
  {company_name:"Thorpe Tulsa OK",                       houston:true,  owner:"",       category:"Refractory"},
  {company_name:"Thorpe Southbelt",                      houston:true,  owner:"",       category:"Refractory"},
  {company_name:"Thorpe St. Gabriel",                    houston:true,  owner:"",       category:"Refractory"},
  {company_name:"United Refractories",                   houston:true,  owner:"",       category:"Refractory"},
  {company_name:"Cox Ref.",                              houston:false, owner:"",       category:"Refractory"},
  {company_name:"Larkin Refractory Solutions",           houston:false, owner:"",       category:"Refractory"},
  {company_name:"Reframerica LLC",                       houston:false, owner:"",       category:"Refractory"},
  {company_name:"Wears Solutions",                       houston:false, owner:"",       category:"Unclassified"},
  {company_name:"Furnace Products and Services, Inc.",   houston:false, owner:"",       category:"Furnace products"},
  {company_name:"Management and Consulting",             houston:false, owner:"",       category:"Consulting"},
  {company_name:"Applied Refractory",                    houston:true,  owner:"",       category:"Refractory"},
  {company_name:"Industrial Specialist",                 houston:true,  owner:"",       category:"Industrial services"},
  {company_name:"Axis Ind. – Scaffold",                  houston:true,  owner:"",       category:"Scaffolding"},
  {company_name:"A-Lert Construction",                   houston:false, owner:"",       category:"Construction"},
  {company_name:"Reno Refractory",                       houston:false, owner:"",       category:"Refractory"},
  {company_name:"BPI Inc",                               houston:false, owner:"",       category:"Unclassified"},
  {company_name:"RAI",                                   houston:false, owner:"",       category:"Unclassified"},
  {company_name:"SnowShoe Ref",                          houston:false, owner:"",       category:"Refractory"},
  {company_name:"Premium Fabrication",                   houston:true,  owner:"",       category:"Fabrication"},
  {company_name:"AL Hill Boiler",                        houston:false, owner:"",       category:"Boiler services"},
  {company_name:"RJ Mechanical",                         houston:false, owner:"",       category:"Mechanical"},
  {company_name:"Oxylance",                              houston:false, owner:"Hardin", category:"Unclassified"},
  {company_name:"Delta Demo Group",                      houston:false, owner:"Hardin", category:"Demolition"},
  {company_name:"C&S Machine Tools",                     houston:false, owner:"",       category:"Machining"},
  {company_name:"FLS Logistics",                         houston:false, owner:"",       category:"Logistics"},
  {company_name:"Steel City Ind.",                       houston:false, owner:"Hardin", category:"Industrial"},
  {company_name:"Southern Pipe",                         houston:false, owner:"Hardin", category:"Pipe & supply", flag:"Discuss at next meeting"},
  {company_name:"Advanced Containment Systems",          houston:true,  owner:"Hardin", category:"Containment systems"},
  {company_name:"DWD International",                     houston:true,  owner:"Hardin", category:"Unclassified"},
  {company_name:"Cosmic International",                  houston:false, owner:"",       category:"Unclassified"}
];

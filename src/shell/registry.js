import { I } from "../shared/icons";

export const APPS=[
  {id:"writer",    label:"Writer",    cat:"Productivity",Icon:I.FileText,dc:"#4A8FE8",desc:"Rich text documents"},
  {id:"sheets",    label:"Sheets",    cat:"Productivity",Icon:I.Grid,    dc:"#3BB580",desc:"Spreadsheets & formulas"},
  {id:"slides",    label:"Slides",    cat:"Productivity",Icon:I.Monitor, dc:"#E87B3A",desc:"Presentation decks"},
  {id:"draw",      label:"Draw",      cat:"Productivity",Icon:I.PenTool, dc:"#A87BE8",desc:"Vector illustrations"},
  {id:"calendar",  label:"Calendar",  cat:"Communication",Icon:I.Calendar,dc:"#84CC16",desc:"Event scheduling"},
  {id:"list",      label:"List",      cat:"Productivity",Icon:I.Checklist,dc:"#14B8A6",desc:"Indented to-do lists"},
];
export const _app=(id)=>APPS.find(a=>a.id===id)||APPS[0];

import { Component, ElementRef, ViewChild } from '@angular/core';
import { AiService } from '../../ai.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {

messages:any[] = [];
userInput = '';
loading = false;
suggestedQuestions: string[] = [
  "How much did I spend today?",
  "How much did I spend yesterday?",
  "How much did I spend this week?",
  "How much did I spend last week?",
  "How much did I spend this month?",
  "How much did I spend last month?",
  "How much did I spend in March 2026?",

  "Which category did I spend the most on?",
  "Which category did I spend the least on?",
  "How much did I spend per category this month?",
  "Show spending by category",

  "Which merchant did I spend the most money on?",
  "Which merchant did I pay the most this month?",
  "Show my top 5 merchants",

  "What are my top 5 transactions?",
  "Show the 10 highest transactions",
  "Show transactions above 5000",
  "Show transactions above 10000",

  "What is my average spending this month?",
  "What is my average transaction amount?",
  "Which day had the highest spending this month?",
  "Which day did I spend the most money?",

  "Show all debit transactions",
  "Show all credit transactions",

  "How much did I spend on UPI payments?",
  "How much did I spend on transport?",
  "How much did I spend on groceries this month?",
  "How much did I spend on food this week?",

  "Show my recent transactions",
  "Show transactions from the last 7 days",
  "Show transactions from the last 30 days",

  "Which category increased the most this month?",
  "What are my biggest expenses this week?",
  "Where am I spending the most money?"
];


showSuggestions = true;

constructor(private aiService: AiService) {}
isMinimized = false;

toggleChat(){
  this.isMinimized = !this.isMinimized;
}
ngOnInit(){

  this.suggestedQuestions =
    this.suggestedQuestions
      .sort(() => 0.5 - Math.random())
      .slice(0,10);

}
send(){

  const msg = this.userInput.trim();
  if(!msg) return;

  this.messages.push({
    role:'user',
    text:msg
  });

  this.userInput='';
  this.loading=true;

  this.aiService.askAI(msg).subscribe((res:any)=>{

    console.log("RAW API:", res);

    // If backend sends string
    if(typeof res === 'string'){
      res = JSON.parse(res);
    }

    const message = res.message;
    let tableData = res.data;

    if(!Array.isArray(tableData)){
      tableData = [tableData];
    }

    this.messages.push({
      role:'ai',
      text: message,
      table: tableData
    });

    this.loading=false;

  });

}

askSuggested(q:string){
  this.showSuggestions = false;
  this.userInput = q;
  this.send();
}

@ViewChild('chatBody') chatBody!: ElementRef;

ngAfterViewChecked(){
  this.scrollToBottom();
}

scrollToBottom(){
  this.chatBody.nativeElement.scroll({
    top: this.chatBody.nativeElement.scrollHeight,
    behavior: 'smooth'
  });
}

objectKeys(obj:any){
  return Object.keys(obj);
}

}

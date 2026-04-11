import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  constructor(private http: HttpClient) {}
// askAI(question: string) {

//   return this.http.get(
//     'http://localhost:8090/ai/ask',
//     {
//       params: { question },
//       responseType: 'text'
//     }
//   );

// }


askAI(question:string){

 return this.http.post(
   "http://localhost:8090/ai/query",
   {question},
   {responseType:'text'}
 )

}
}

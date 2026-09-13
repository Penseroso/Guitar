/** Bounded max-heap: comparator's greatest item is the worst retained row. */
export class PageHeap<T> {
    private rows:T[]=[];
    constructor(readonly limit:number,private compare:(a:T,b:T)=>number){}
    offer(row:T):void {
        if(this.rows.length<this.limit){this.rows.push(row);this.up(this.rows.length-1);}
        else if(this.compare(row,this.rows[0])<0){this.rows[0]=row;this.down(0);}
    }
    sorted():T[]{return [...this.rows].sort(this.compare);}
    get size(){return this.rows.length;}
    private up(index:number){while(index>0){const parent=(index-1)>>1;if(this.compare(this.rows[parent],this.rows[index])>=0)break;
        [this.rows[parent],this.rows[index]]=[this.rows[index],this.rows[parent]];index=parent;}}
    private down(index:number){for(;;){let child=index*2+1;if(child>=this.rows.length)break;
        if(child+1<this.rows.length&&this.compare(this.rows[child+1],this.rows[child])>0)child++;
        if(this.compare(this.rows[index],this.rows[child])>=0)break;
        [this.rows[index],this.rows[child]]=[this.rows[child],this.rows[index]];index=child;}}
}

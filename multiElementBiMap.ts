export class MultiElementBiMap<K, V> {
    private forwardMap: Map<K,V> = new Map<K, V>();
    private reverseMap: Map<V,Set<K>> = new Map<V, Set<K>>();
    constructor(){
        
    }

    public add(key: K, value: V){
        this.removeByKey(key);
        this.forwardMap.set(key,value);

        if(!this.reverseMap.has(value)){
            this.reverseMap.set(value, new Set<K>())
        }
        this.reverseMap.get(value)?.add(key);
    }

    public getByKey(key: K): V | undefined{
        return this.forwardMap.get(key);
    }

    public hasKey(key : K) : boolean {
        return this.forwardMap.has(key);
    }

    public removeByKey(key: K): boolean{
        const value = this.forwardMap.get(key);
        if(!value){
            return false;
        }
        this.forwardMap.delete(key);
            
        const keySet = this.reverseMap.get(value);
        if(keySet){
            if(keySet.size <= 1){
                this.reverseMap.delete(value);
            }
            else{
                keySet.delete(key);
            }
        }
        return true;
    }

    public removeKeysWithValue(value: V): boolean{
        const keySet = this.reverseMap.get(value);
        if(!keySet || keySet.size <= 0){
            return false;
        }

        keySet.forEach((key) => {
            this.forwardMap.delete(key);
        });
        this.reverseMap.delete(value);
        
        return true;
    }
}
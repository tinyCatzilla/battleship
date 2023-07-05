export class Ship {
    constructor(
        public type: string,
        public shape: string[][],
        public position: { row: number; column: number },
        public orientation: 'horizontal' | 'vertical'
    ) {}
}

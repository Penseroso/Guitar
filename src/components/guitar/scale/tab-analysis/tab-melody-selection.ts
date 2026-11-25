export interface MelodyCell {
    momentId: string;
    noteId: string;
    position: number;
    string: number;
}

export function adjacentMelodyCell(cells: readonly MelodyCell[], from: MelodyCell, key: string) {
    const vertical = key === 'ArrowUp' || key === 'ArrowDown';
    const direction = key === 'ArrowUp' || key === 'ArrowLeft' ? -1 : 1;
    let nearest: MelodyCell | undefined;
    let distance = Infinity;
    for (const cell of cells) {
        if (vertical && cell.position !== from.position) continue;
        const delta = vertical ? cell.string - from.string : cell.position - from.position;
        if (delta * direction <= 0) continue;
        const steps = Math.abs(delta);
        const closerString = nearest && Math.abs(cell.string - from.string) < Math.abs(nearest.string - from.string);
        if (steps < distance || (steps === distance && closerString)) {
            nearest = cell;
            distance = steps;
        }
    }
    return nearest;
}

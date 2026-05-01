// SelectList Example
//
// Demonstrates a scrollable selection list.

import { TerminalUI, ProcessTerminal, SelectList, Text, ElementContainer } from '@picro/tui';

class ListDemo extends ElementContainer {
  private selectList = new SelectList({
    items: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Cherry', value: 'cherry' },
      { label: 'Date', value: 'date' },
      { label: 'Elderberry', value: 'elderberry' },
      { label: 'Fig', value: 'fig' },
      { label: 'Grape', value: 'grape' },
      { label: 'Honeydew', value: 'honeydew' },
    ],
    onSelect: (item) => {
      this.children = [new Text(`You selected: ${item.label}`)];
    },
  });

  draw(context) {
    return this.selectList.draw(context);
  }
}

const terminal = new ProcessTerminal();
const tui = new TerminalUI(terminal);
tui.append(new ListDemo());
tui.start();

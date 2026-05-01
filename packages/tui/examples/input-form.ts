// Input Form Example
//
// Shows an input field and a submit button (simple).

import { TerminalUI, ProcessTerminal, Input, Text, ElementContainer } from '@picro/tui';

class Form extends ElementContainer {
  private input = new Input({
    placeholder: 'Enter your name',
    onSubmit: (value) => {
      this.showGreeting(value);
    },
  });

  draw(context) {
    const lines: string[] = [];
    lines.push('Please enter your name:');
    lines.push(this.input.draw(context)[0]);
    return lines;
  }

  private showGreeting(name: string) {
    // Replace content with greeting
    this.children = [new Text(`Hello, ${name}! Press Esc to exit.`)];
  }
}

const terminal = new ProcessTerminal();
const tui = new TerminalUI(terminal);
tui.append(new Form());
tui.start();

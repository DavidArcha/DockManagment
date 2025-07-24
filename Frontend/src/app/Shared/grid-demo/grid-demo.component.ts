import { Component } from '@angular/core';

@Component({
  selector: 'app-grid-demo',
  standalone: false,
  templateUrl: './grid-demo.component.html',
  styleUrl: './grid-demo.component.scss'
})
export class GridDemoComponent {
  myGridData = [
    {
      "children": [
        {
          "children": [],
          "name": "Grid 1",
          "type": "grid"
        },
        {
          "children": [],
          "name": "Grid 2",
          "type": "grid"
        }
      ],
      "id": 1,
      "label": "1-12-2024"
    },
    {
      "children": [
        {
          "children": [],
          "name": "Grid 1",
          "type": "grid"
        },
        {
          "children": [],
          "name": "Grid 2",
          "type": "grid"
        }
      ],
      "id": 2,
      "label": "1-10-2024"
    },
    {
      "children": [
        {
          "children": [],
          "name": "Grid 1",
          "type": "grid"
        },
        {
          "children": [],
          "name": "Grid 2",
          "type": "grid"
        }
      ],
      "id": 3,
      "label": "1-8-2024"
    }
  ];
}

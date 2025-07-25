import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'your-project-name';

  // Sample data to pass to the multilevel grid component
  multiGridData = [
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
      "label": "Multigrid Example 1"
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
      "label": "Multigrid Example 2"
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
      "label": "Multigrid Example 3"
    }
  ];
}

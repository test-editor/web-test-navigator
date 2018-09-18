import { FilterState } from '../filter-bar/filter-bar.component';
import { TestNavigatorTreeNode} from './test-navigator-tree-node';
import { ElementType } from '../persistence-service/workspace-element';
import { filterFor } from './filters';

describe('filterFor', () => {

  // 'state' test vector encoding:
  // [<tsl filter on?>, <tcl filter on?>, <aml filter on?>, <file visible?>]


  [[0, 0, 0, 1], [0, 0, 1, 0], [0, 1, 0, 0], [0, 1, 1, 0], [1, 0, 0, 1], [1, 0, 1, 1], [1, 1, 0, 1], [1, 1, 1, 1]].forEach((state) => {
    it(`tsl files are ${state[3] ? 'shown' : 'hidden'} for filter state [${state.slice(0, 3)}]`, () => {
      // given
      const filterState: FilterState = { tsl: !!state[0], tcl: !!state[1], aml: !!state[2] };
      const node = new TestNavigatorTreeNode({children: [], name: '', path: 'file.tsl', type: ElementType.File});

      // when
      const visible = filterFor(filterState, node);

      // then
      expect(visible).toEqual(!!state[3]);
    });
  });

  [[0, 0, 0, 1], [0, 0, 1, 0], [0, 1, 0, 1], [0, 1, 1, 1], [1, 0, 0, 0], [1, 0, 1, 0], [1, 1, 0, 1], [1, 1, 1, 1]].forEach((state) => {
    ['tcl', 'tml', 'config'].forEach((extension) => {
      it(`${extension} files are ${state[3] ? 'shown' : 'hidden'} for filter state [${state.slice(0, 3)}]`, () => {
        // given
        const filterState: FilterState = { tsl: !!state[0], tcl: !!state[1], aml: !!state[2] };
        const node = new TestNavigatorTreeNode({children: [], name: '', path: `file.${extension}`, type: ElementType.File});

        // when
        const visible = filterFor(filterState, node);

        // then
        expect(visible).toEqual(!!state[3]);
      });
    });
  });

  [[0, 0, 0, 1], [0, 0, 1, 1], [0, 1, 0, 0], [0, 1, 1, 1], [1, 0, 0, 0], [1, 0, 1, 1], [1, 1, 0, 0], [1, 1, 1, 1]].forEach((state) => {
    it(`aml files are ${state[3] ? 'shown' : 'hidden'} for filter state [${state.slice(0, 3)}]`, () => {
      // given
      const filterState: FilterState = { tsl: !!state[0], tcl: !!state[1], aml: !!state[2] };
      const node = new TestNavigatorTreeNode({children: [], name: '', path: 'file.aml', type: ElementType.File});

      // when
      const visible = filterFor(filterState, node);

      // then
      expect(visible).toEqual(!!state[3]);
    });
  });

  [[0, 0, 0], [0, 0, 1], [0, 1, 0], [0, 1, 1], [1, 0, 0], [1, 0, 1], [1, 1, 0], [1, 1, 1]].forEach((state) => {
    it(`folders are always shown (also for filter state [${state.slice(0, 3)}])`, () => {
      // given
      const filterState: FilterState = { tsl: !!state[0], tcl: !!state[1], aml: !!state[2] };
      const node = new TestNavigatorTreeNode({children: [], name: '', path: 'folder.aml', type: ElementType.Folder});

      // when
      const visible = filterFor(filterState, node);

      // then
      expect(visible).toBeTruthy();
    });
  });

  [[0, 0, 0], [0, 0, 1], [0, 1, 0], [0, 1, 1], [1, 0, 0], [1, 0, 1], [1, 1, 0], [1, 1, 1]].forEach((state) => {
    it(`files with unknown extensions are always hidden (also for filter state [${state.slice(0, 3)}])`, () => {
      // given
      const filterState: FilterState = { tsl: !!state[0], tcl: !!state[1], aml: !!state[2] };
      const node = new TestNavigatorTreeNode({children: [], name: '', path: 'file.unknown', type: ElementType.File});

      // when
      const visible = filterFor(filterState, node);

      // then
      expect(visible).toBeFalsy();
    });
  });
});

import { useRef, useEffect, useState } from "react";
import { ItemData, ITypeColors } from '../types';

const TYPE_DATA: Record<string, ITypeColors> = {
  temperature: {
    line: '#EF5350',
    point: '#C0392B',
    text: 'Температура'
  },
  precipitation: {
    line: "#5DADE2",
    point: "#3498DB",
    text: 'Осадки'
  }
};

const MIN_WIDTH = 524;
const MAX_WIDTH = 1200;
const MONTHS_IN_YEAR = 12;
const MONTH_WIDTH = 40;
const YEAR_STEP_LARGE = 10;
const YEAR_STEP_MEDIUM = 3;
const POINT_WIDTH = 80;
const CANVAS_PADDING = 40;

function prepareData(data: ItemData[], yearStart: number, yearEnd: number) {
  // сгруппируем данные по году и месяцу, чтобы потом считать среднее
  const monthlySums = new Map<string, { sum: number; count: number; year: number; month: number }>();

  // группируем все данные по месяцам и годам, считая сумму значений и количество элементов для каждого месяца
  data.forEach(({ date, value }) => {
    const d = new Date(date);
    // формируем ключ в формате год-месяц
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthlySums.has(key)) {
      monthlySums.set(key, { sum: 0, count: 0, year: d.getFullYear(), month: d.getMonth() });
    }
    const entry = monthlySums.get(key)!;
    entry.sum += value;
    entry.count++;
  });

  // посчитаем среднее значение для каждого месяца
  const monthlyData = Array.from(monthlySums.values()).map(({ sum, count, year, month }) => ({
    date: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    value: sum / count,
  }));

  // отсортируем по дате
  monthlyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // определяем сколько контрольных точек будем показывать 
  const totalYears = yearEnd - yearStart + 1;
  let monthsInGroup;
  // если выборка за более чем 30 лет каждые 6 месяцев объединяются в одну группу и вычисляется среднее по этим шести месяцам
  if (totalYears > 30) {
    monthsInGroup = 6;
    // каждые 3 месяца объединяюся в одну группу и для этой группы считается среднее значение показателя.
  } else if (totalYears > 10) {
    monthsInGroup = 3;
  } else {
    // берётся каждый месяц по отдельности
    monthsInGroup = 1;
  }
  // сгруппируем данные и посчитаем среднее для каждой группы
  const result = [];
  for (let i = 0; i < monthlyData.length; i += monthsInGroup) {
    const group = monthlyData.slice(i, i + monthsInGroup);
    const avgValue = group.reduce((sum, item) => sum + item.value, 0) / group.length;
    result.push({ date: group[0].date, value: avgValue });
  }
  return result;
}

// возвращает ширину для canvas
// по макету ширина под график 546 пикселей, данные за 120 лет невозможно информативно показать
// в таком узком окошке, поэтому если график не помещается в окошко на форме появится скролл внизу
function getCanvasWidth(yearStart: number, yearEnd: number) {
  const totalYears = yearEnd - yearStart + 1;
  let width;
  // если выбран 1 год будет график по месяцам
  if (totalYears === 1) {
    width = MONTHS_IN_YEAR * MONTH_WIDTH;
  } else {
    let yearStep = 1;
    if (totalYears > 30) {
      yearStep = YEAR_STEP_LARGE;
    } else if (totalYears > 10) {
      yearStep = YEAR_STEP_MEDIUM;
    }
    const totalPoints = Math.ceil(totalYears / yearStep);
    width = totalPoints * POINT_WIDTH;
  }
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

export default function Graph({
  data,
  type,
  yearStart,
  yearEnd
}: {
  data: ItemData[],
  type: string,
  yearStart: number,
  yearEnd: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverPos, setHoverPos] = useState(null);
  const width = getCanvasWidth(yearStart, yearEnd);

  useEffect(() => {
    if (!data || !data.length) return;
    const monthlyData = prepareData(data, yearStart, yearEnd);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const chartHeight = canvas.height - CANVAS_PADDING * 2;
    const chartWidth = canvas.width - CANVAS_PADDING * 2;
    const maxValue = Math.max(...monthlyData.map((d) => d.value));
    const minValue = Math.min(...monthlyData.map((d) => d.value));
    const dateToX = (dateStr: string) => {
      const d = new Date(dateStr);
      return (
        CANVAS_PADDING +
        ((d.getFullYear() + d.getMonth() / 12 - yearStart) / (yearEnd + 1 - yearStart)) *
        chartWidth
      );
    };
    const valueToY = (value: number) =>
      CANVAS_PADDING + ((maxValue - value) / (maxValue - minValue)) * chartHeight;

    function draw() {
      if (!context || !canvas) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#000";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(CANVAS_PADDING, CANVAS_PADDING);
      context.lineTo(CANVAS_PADDING, canvas.height - CANVAS_PADDING);
      context.lineTo(canvas.width - CANVAS_PADDING, canvas.height - CANVAS_PADDING);
      context.stroke();
      context.fillStyle = "#000";
      context.textAlign = "center";
      context.textBaseline = "top";
      context.font = "14px Arial";

      const totalYears = yearEnd - yearStart + 1;
      let yearStep = 1;
      let showMonth = false;
      // определяем сколько лет будет шаг по оси X
      // такой же принцип как и выше
      if (totalYears === 1) {
        showMonth = true;
      } else {
        if (totalYears > 30) {
          yearStep = 10;
        } else if (totalYears > 10) {
          yearStep = 3;
        }
      }
      if (showMonth) {
        for (let year = yearStart; year <= yearEnd; year++) {
          for (let month = 0; month < 12; month++) {
            const fractionalYear = year + month / 12;
            const x = CANVAS_PADDING + ((fractionalYear - yearStart) / (yearEnd + 1 - yearStart)) * chartWidth;
            const y = canvas.height - CANVAS_PADDING;
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x, y + 6);
            context.stroke();
            context.fillText(String(month + 1), x, y + 8);
          }
        }
      } else {
        for (let year = Math.ceil(yearStart / yearStep) * yearStep; year <= yearEnd; year += yearStep) {
          const x = CANVAS_PADDING + ((year - yearStart) / (yearEnd + 1 - yearStart)) * chartWidth;
          const y = canvas.height - CANVAS_PADDING;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x, y + 6);
          context.stroke();
          context.fillText(year.toString(), x, y + 8);
        }
      }

      context.textAlign = "right";
      context.textBaseline = "middle";

      // рисуем ось Y
      const yStep = (maxValue - minValue) / 5;
      for (let i = 0; i <= 5; i++) {
        const value = minValue + i * yStep;
        const y = valueToY(value);
        context.beginPath();
        context.moveTo(CANVAS_PADDING - 6, y);
        context.lineTo(CANVAS_PADDING, y);
        context.stroke();
        context.fillText(value.toFixed(1), CANVAS_PADDING - 10, y);
      }

      // рисуем ломаную линию
      context.strokeStyle = TYPE_DATA[type].line;
      context.lineWidth = 2;
      context.beginPath();
      monthlyData.forEach((point, i) => {
        const x = dateToX(point.date);
        const y = valueToY(point.value);
        if (i === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });
      context.stroke();

      // проставим точки для удобства т к данных очень много, получить информацию можно по ховеру
      monthlyData.forEach((point) => {
        const x = dateToX(point.date);
        const y = valueToY(point.value);
        context.beginPath();
        context.arc(x, y, 3, 0, Math.PI * 2);
        context.fillStyle = "#fff";
        context.fill();
        context.strokeStyle = TYPE_DATA[type].point;
        context.lineWidth = 1.5;
        context.stroke();
      });

      // всплывашка по ховеру на точки
      if (hoverPos && hoverPos.point) {
        const { x, y, point } = hoverPos;
        const paddingTooltip = 6;
        const tooltipText1 = `Дата: ${point.date}`;
        const tooltipText2 = `${TYPE_DATA[type].text}: ${point.value.toFixed(2)}`;
        context.font = "12px Arial";
        context.textAlign = "left";
        context.textBaseline = "top";
        const boxWidth = 120;
        const boxHeight = 34;
        let boxX = x + 10;
        if (boxX + boxWidth > canvas.width) boxX = x - boxWidth - 10;
        let boxY = y - boxHeight - 10;
        if (boxY < 0) boxY = y + 10;
        context.fillStyle = "rgba(255,255,255,0.9)";
        context.strokeStyle = "black";
        context.lineWidth = 1;
        context.fillRect(boxX, boxY, boxWidth, boxHeight);
        context.strokeRect(boxX, boxY, boxWidth, boxHeight);
        context.fillStyle = "black";
        context.fillText(tooltipText1, boxX + paddingTooltip, boxY + 4);
        context.fillText(tooltipText2, boxX + paddingTooltip, boxY + 18);
        context.beginPath();
        context.arc(x, y, 6, 0, Math.PI * 2);
        context.strokeStyle = TYPE_DATA[type].point;
        context.lineWidth = 2;
        context.stroke();
      }
    }

    draw();

    function handleMouseMove(event: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      let closestPoint = null;
      let minDist = Infinity;
      monthlyData.forEach((point) => {
        const x = dateToX(point.date);
        const y = valueToY(point.value);
        const dist = Math.abs(x - mouseX);
        if (dist < minDist && Math.abs(y - mouseY) < 20) {
          minDist = dist;
          closestPoint = { x, y, point };
        }
      });
      if (closestPoint) {
        setHoverPos(closestPoint);
      } else {
        setHoverPos(null);
      }
      draw();
    }

    function handleMouseLeave() {
      setHoverPos(null);
      draw();
    }

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [data, hoverPos, yearStart, yearEnd, width]);

  return (
    <div
      style={{
        width: MIN_WIDTH,
        overflowX: "auto",
        border: "1px solid #ccc",
        padding: "10px",
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={400}
      />
    </div>
  );
}

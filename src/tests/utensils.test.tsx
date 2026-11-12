import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UtensilCalibration from '../pages/UtensilCalibration'
import { emptyAppData, useAppStore } from '../store/appStore'

describe('功能六：餐具校准与用量估算', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      data: structuredClone(emptyAppData),
      initialized: true,
    })
  })

  it('校准页明确提示水容量不等于盐油重量', () => {
    render(<UtensilCalibration />)
    expect(
      screen.getByText(/水的容量校准不会直接等同于盐、油或米的重量/),
    ).toBeInTheDocument()
  })

  it('必须填写餐具名称和水量', async () => {
    const user = userEvent.setup()
    render(<UtensilCalibration />)
    await user.click(screen.getByRole('button', { name: '保存校准' }))
    expect(await screen.findByText('请填写餐具名称。')).toBeInTheDocument()

    await user.type(screen.getByLabelText('餐具名称'), '白碗')
    await user.click(screen.getByRole('button', { name: '保存校准' }))
    expect(await screen.findByText(/请填写大于 0 的水量/)).toBeInTheDocument()
  })

  it('一碗水按 1g=1ml 保存容量校准', async () => {
    const user = userEvent.setup()
    render(<UtensilCalibration />)

    await user.type(screen.getByLabelText('餐具名称'), '家常白碗')
    await user.click(screen.getByRole('button', { name: '碗' }))
    await user.selectOptions(screen.getByLabelText('校准方式'), '一碗水')
    await user.type(screen.getByLabelText(/水量或称重结果/), '300')
    await user.type(screen.getByLabelText('参照物说明'), '一枚硬币')
    await user.type(screen.getByLabelText('备注'), '日常用碗')
    await user.click(screen.getByRole('button', { name: '保存校准' }))

    await waitFor(() => {
      expect(useAppStore.getState().data.utensilCalibrations.length).toBe(1)
    })

    const calibration = useAppStore.getState().data.utensilCalibrations[0]
    expect(calibration.name).toBe('家常白碗')
    expect(calibration.kind).toBe('bowl')
    expect(calibration.volumeMl).toBe(300)
    expect(calibration.method).toBe('一碗水')
    expect(calibration.reference).toBe('一枚硬币')
    expect(calibration.note).toBe('日常用碗')
  })

  it('校准记录会保存到本地', async () => {
    const user = userEvent.setup()
    render(<UtensilCalibration />)
    await user.type(screen.getByLabelText('餐具名称'), '汤勺')
    await user.click(screen.getByRole('button', { name: '勺' }))
    await user.type(screen.getByLabelText(/水量或称重结果/), '10')
    await user.click(screen.getByRole('button', { name: '保存校准' }))

    await waitFor(() => {
      expect(screen.getByText('汤勺')).toBeInTheDocument()
    })

    const raw = localStorage.getItem('family-nutritionist-data')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.utensilCalibrations[0].name).toBe('汤勺')
    expect(parsed.utensilCalibrations[0].volumeMl).toBe(10)
  })
})
